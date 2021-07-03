import {Req as PrepareConfRequest} from '../ext-plugin/a6/prepare-conf/req'
import { Resp as PrepareConfResponse} from '../ext-plugin/a6/prepare-conf/resp'
import {ByteBuffer, Builder} from 'flatbuffers'
import Runner from '../runner';

const RPC_ERROR = 0
const RPC_PREPARE_CONF = 1
const RPC_HTTP_REQ_CALL = 2

class RPCServer {

    private runner: Runner

    constructor(runner: Runner) {
        this.runner = runner
    }

    /**
     * 
     * @param ty 
     * @param bytes 
     */
    async dispatch(ty: number, bytes: Uint8Array) {
        const builder = new Builder()
        if (ty === RPC_PREPARE_CONF) {
            await this.prepareConf(new ByteBuffer(bytes), builder)
        }
        if (ty === RPC_HTTP_REQ_CALL) {
            await this.httpReqCall()
        }
        return builder.dataBuffer().bytes()
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
        builder.finish(PrepareConfResponse.endResp(builder))
    }

    async httpReqCall() {
    }


}

export default RPCServer