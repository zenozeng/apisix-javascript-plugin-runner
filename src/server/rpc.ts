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

import { Req as PrepareConfRequest } from '../ext-plugin-proto/typescript/a6/prepare-conf/req.js'
import { Req as ExtraInfoRequest } from '../ext-plugin-proto/typescript/a6/extra-info/req'
import { Info as ExtraInfoInfo } from '../ext-plugin-proto/typescript/a6/extra-info/info'
import { Resp as ExtraInfoResponse } from '../ext-plugin-proto/typescript/a6/extra-info/resp'
import { ReqBody as ExtraInfoRequestBody } from '../ext-plugin-proto/typescript/a6/extra-info/req-body'
import { Resp as PrepareConfResponse } from '../ext-plugin-proto/typescript/a6/prepare-conf/resp.js'
import { Req as HTTPReqCallRequest } from '../ext-plugin-proto/typescript/a6/h-t-t-p-req-call/req.js'
import { Resp as HTTPReqCallResponse } from '../ext-plugin-proto/typescript/a6/h-t-t-p-req-call/resp.js'
import { Stop } from '../ext-plugin-proto/typescript/a6/h-t-t-p-req-call/stop.js'
import { Rewrite } from '../ext-plugin-proto/typescript/a6/h-t-t-p-req-call/rewrite.js'
import { Action } from '../ext-plugin-proto/typescript/a6/h-t-t-p-req-call/action.js'
import { Method } from '../ext-plugin-proto/typescript/a6/method.js'
import { ByteBuffer, Builder } from 'flatbuffers'
import Runner, { Request, Response } from '../runner/index.js'
import { TextEntry } from '../ext-plugin-proto/typescript/ext-plugin.js'

const RPC_ERROR = 0
const RPC_PREPARE_CONF = 1
const RPC_HTTP_REQ_CALL = 2
const RPC_EXTRA_INFO = 3

const HEADER_LEN = 4

interface Connection {
    read: (size: number) => Promise<Uint8Array>
    write: (data: Uint8Array) => Promise<boolean>
}

class RPCServer {

    protected runner: Runner

    constructor(runner: Runner) {
        this.runner = runner

    }

    async readMessage(connection: Connection) {
        const buf = await connection.read(HEADER_LEN)
        const ty = buf[0]
        const dataLength = Buffer.from([0, buf[1], buf[2], buf[3]]).readInt32BE()
        const data = await connection.read(dataLength)
        return { ty, data }
    }

    async writeMessage(connection: Connection, { ty, data }: { ty: number, data: Uint8Array }) {
        const respSize = data.length
        const header = Buffer.alloc(HEADER_LEN)
        header.writeUInt32BE(respSize, 0)
        header[0] = ty
        connection.write(header)
        connection.write(data)
    }

    async onConnection(connection: Connection) {
        const { ty, data } = await this.readMessage(connection)
        const response = await this.dispatch(connection, ty, data)
        await this.writeMessage(connection, {
            ty,
            data: response
        })
    }

    async dispatch(connection: Connection, ty: number, bytes: Uint8Array) {
        const builder = new Builder()
        const buf = new ByteBuffer(bytes)
        switch (ty) {
            case RPC_PREPARE_CONF:
                await this.prepareConf(buf, builder)
                break
            case RPC_HTTP_REQ_CALL:
                await this.httpReqCall(connection, buf, builder)
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
            list.push({ name, value })
        }
        const confToken = this.runner.prepareConf(req.key(), list)
        PrepareConfResponse.startResp(builder)
        PrepareConfResponse.addConfToken(builder, confToken)
        console.debug(`prepareConf: confToken: ${confToken}`)
        builder.finish(PrepareConfResponse.endResp(builder))
    }

    async httpReqCall(connection: Connection, buf: ByteBuffer, builder: Builder) {
        const req = HTTPReqCallRequest.getRootAsReq(buf)
        const request = {
            id: req.id(),
            path: req.path(),
            headers: new Map(),
            srcIp: [] as number[],
            method: this.getMethodName(req.method()),
            args: new Map(),
            body: async () => {
                const builder = new Builder()
                const reqBody = ExtraInfoRequestBody.createReqBody(builder)
                ExtraInfoRequest.startReq(builder)
                ExtraInfoRequest.addInfoType(builder, ExtraInfoInfo.ReqBody)
                ExtraInfoRequest.addInfo(builder, reqBody)
                builder.finish(ExtraInfoRequest.endReq(builder))
                await this.writeMessage(connection, {
                    ty: RPC_EXTRA_INFO,
                    data: builder.asUint8Array()
                })
                let { data } = await this.readMessage(connection)
                let resp = ExtraInfoResponse.getRootAsResp(new ByteBuffer(data))
                let resultArray = resp.resultArray()
                if (!resultArray) {
                    return ''
                }
                return new TextDecoder().decode(resultArray)
            }
        }
        for (let i = 0; i < req.srcIpLength(); i++) {
            request.srcIp.push(req.srcIp(i))
        }
        for (let i = 0; i < req.headersLength(); i++) {
            request.headers.set(req.headers(i).name(), req.headers(i).value())
        }
        for (let i = 0; i < req.argsLength(); i++) {
            request.args.set(req.args(i).name(), req.args(i).value())
        }
        const confToken = req.confToken()
        const { isStop, response } = await this.runner.httpReqCall(confToken, request)
        let action = isStop ? this.createStop(builder, response) : this.createRewrite(builder, request)
        let actionType = isStop ? Action.Stop : Action.Rewrite
        console.debug({ isStop, response })
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

    protected mapToTextEntries(builder: Builder, m: { keys(): Iterable<string>, get(k: string): string }) {
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
