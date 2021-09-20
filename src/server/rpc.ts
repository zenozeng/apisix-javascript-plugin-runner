// Licensed to the Apache Software Foundation (ASF) under one or more
// contributor license agreements.  See the NOTICE file distributed with
// this work for additional information regarding copyright ownership.
// The ASF licenses this file to You under the Apache License, Version 2.0
// (the "License"); you may not use this file except in compliance with
// the License.  You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Req as PrepareConfRequest } from '../ext-plugin-proto/typescript/a6/prepare-conf/req'
import { Resp as PrepareConfResponse } from '../ext-plugin-proto/typescript/a6/prepare-conf/resp'
import { Req as HTTPReqCallRequest } from '../ext-plugin-proto/typescript/a6/h-t-t-p-req-call/req'
import { Resp as HTTPReqCallResponse } from '../ext-plugin-proto/typescript/a6/h-t-t-p-req-call/resp'
import { Stop } from '../ext-plugin-proto/typescript/a6/h-t-t-p-req-call/stop'
import { Rewrite } from '../ext-plugin-proto/typescript/a6/h-t-t-p-req-call/rewrite'
import { Action } from '../ext-plugin-proto/typescript/a6/h-t-t-p-req-call/action'
import { Method } from '../ext-plugin-proto/typescript/a6/method'
import { ByteBuffer, Builder } from 'flatbuffers'
import Runner, { Request, Response } from '../runner'
import { TextEntry } from '../ext-plugin-proto/typescript/ext-plugin'

const RPC_ERROR = 0
const RPC_PREPARE_CONF = 1
const RPC_HTTP_REQ_CALL = 2

class RPCServer {

    protected runner: Runner

    constructor(runner: Runner) {
        this.runner = runner
    }

    async dispatch(ty: number, bytes: Uint8Array) {
        const builder = new Builder()
        const buf = new ByteBuffer(bytes)
        switch (ty) {
            case RPC_PREPARE_CONF:
                await this.prepareConf(buf, builder)
                break
            case RPC_HTTP_REQ_CALL:
                await this.httpReqCall(buf, builder)
                break
            default:
                throw new Error(`JavaScript Plugin Runner: Failed to dispatch ty ${ty}, bytes: ${bytes.length}`)
        }
        return builder.asUint8Array()
    }

    async prepareConf(buf: ByteBuffer, builder: Builder) {
        const req = PrepareConfRequest.getRootAsReq(buf)
        const list = [];
        for (let i = 0; i < req.confLength(); i++) {
            const conf = req.conf(i)
            const name = conf.name()
            const value = conf.value()
            list.push({name, value})
        }
        const confToken = this.runner.prepareConf(list)
        PrepareConfResponse.startResp(builder)
        PrepareConfResponse.addConfToken(builder, confToken)
        console.debug(`prepareConf: confToken: ${confToken}`)
        builder.finish(PrepareConfResponse.endResp(builder))
    }

    async httpReqCall(buf: ByteBuffer, builder: Builder) {
        const req = HTTPReqCallRequest.getRootAsReq(buf)
        const request = {
            id: req.id(),
            path: req.path(),
            headers: new Map(),
            srcIp: [] as number[],
            method: this.getMethodName(req.method()),
            args: new Map()
        }
        for (let i = 0; i < req.srcIpLength(); i++) {
            request.srcIp.push(req.srcIp(i))
        }
        for (let i = 0; i < req.headersLength(); i++) {
            request.headers.set(req.headers(i).name(), req.headers(i).value())
        }
        for (let i = 0; i < req.argsLength(); i++) {
            request.headers.set(req.args(i).name(), req.args(i).value())
        }
        const confToken = req.confToken()
        const {isStop, response} = await this.runner.httpReqCall(confToken, request)
        let action = isStop ? this.createStop(builder, response) : this.createRewrite(builder, request)
        let actionType = isStop ? Action.Stop : Action.Rewrite
        console.debug({isStop, response})
        HTTPReqCallResponse.startResp(builder)
        HTTPReqCallResponse.addId(builder, request.id)
        HTTPReqCallResponse.addAction(builder, action)
        HTTPReqCallResponse.addActionType(builder, actionType)
        builder.finish(HTTPReqCallResponse.endResp(builder))
    }

    protected createStop(builder: Builder, response: Response) {
        if (typeof response.body === 'string') {
            response.body = Buffer.from(response.body)
        }
        const bodyVec = response.body && Stop.createBodyVector(builder, response.body)
        const textEntries = this.mapToTextEntries(builder, response.headers)
        const headerVec = response.headers && Stop.createHeadersVector(builder, textEntries)
        Stop.startStop(builder)
        Stop.addStatus(builder, response.status)
        if (response.body) {
            Stop.addBody(builder, bodyVec)
        }
        if (response.headers) {
            Stop.addHeaders(builder, headerVec)
        }
        return Stop.endStop(builder)
    }

    protected createRewrite(builder: Builder, request: Request) {
        const path = builder.createString(request.path)
        const headerTextEntries = this.mapToTextEntries(builder, request.headers)
        const headerVec = request.headers && Rewrite.createHeadersVector(builder, headerTextEntries)
        const argsTextEntries = this.mapToTextEntries(builder, request.args)
        const argsVec = request.args && Rewrite.createArgsVector(builder, argsTextEntries)
        Rewrite.startRewrite(builder)
        Rewrite.addPath(builder, path)
        if (request.headers) {
            Rewrite.addHeaders(builder, headerVec)
        }
        if (request.args) {
            Rewrite.addArgs(builder, argsVec)
        }
        return Rewrite.endRewrite(builder)
    }

    protected mapToTextEntries(builder: Builder, m: {keys(): Iterable<string>, get(k: string): string}) {
        const textEntries = []
        if (m) {
            for (let k of m.keys()) {
                const name = builder.createString(k)
                const value = builder.createString(m.get(k))
                TextEntry.startTextEntry(builder)
                TextEntry.addName(builder, name)
                TextEntry.addValue(builder, value)
                textEntries.push(TextEntry.endTextEntry(builder))
            }
        }
        return textEntries
    }

    protected getMethodName(method: Method) {
        const t = {
            [Method.GET]: 'GET',
            [Method.HEAD]: 'HEAD',
            [Method.POST]: 'POST',
            [Method.PUT]: 'PUT',
            [Method.DELETE]: 'DELETE',
            [Method.MKCOL]: 'MKCOL',
            [Method.COPY]: 'COPY',
            [Method.MOVE]: 'MOVE',
            [Method.OPTIONS]: 'OPTIONS',
            [Method.PROPFIND]: 'PROPFIND',
            [Method.PROPPATCH]: 'PROPPATCH',
            [Method.LOCK]: 'LOCK',
            [Method.UNLOCK]: 'UNLOCK',
            [Method.PATCH]: 'PATCH',
            [Method.TRACE]: 'TRACE'
        }
        return t[method];
    }
}

export default RPCServer