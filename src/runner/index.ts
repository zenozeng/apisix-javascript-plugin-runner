class Runner {
    public confCacheTTL: number

    constructor(options: {confCacheTTL: number}) {
        this.confCacheTTL = options.confCacheTTL
    }

}

export default Runner