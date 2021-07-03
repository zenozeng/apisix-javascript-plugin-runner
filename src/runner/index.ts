interface Plugin {
    getName(): string
    parseConf(conf: string): string
}

class Runner {
    public confCacheTTL: number
    private plugins: Plugin[]
    private pluginMap: {
        [name: string]: Plugin
    }
    private cacheCount: number
    private cache: {
        [key: string]: any
    }

    constructor() {
        this.plugins = []
        this.pluginMap = {}
        this.cacheCount = 0
        this.cache = {}
    }

    registerPlugin(plugin: Plugin) {
        console.log(`Register JavaScript Plugin: ${plugin.getName()}`)
        this.pluginMap[plugin.getName()] = plugin
        this.plugins.push(plugin)
    }

    genCacheToken() {
        this.cacheCount++
        return this.cacheCount
    }

    setCache(k: string, val: Object) {
        this.cache[k] = val
    }

    prepareConf(confList: {name: string, value: string}[]): number {
        confList = confList.
            filter(({name}) => this.pluginMap[name]).
            map(({name, value}) => {
                return {name, value: this.pluginMap[name].parseConf(value)}
            })
        const token = this.genCacheToken()
        this.setCache(token.toString(), confList)
        return token
    }

}

export default Runner