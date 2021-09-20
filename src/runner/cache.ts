class Cache {
    private cache: {
        [key: string]: any
    }

    constructor() {
        this.cache = {}
    }

    set(k: string, val: any) {
        this.cache[k] = val
    }

    /**
     * 
     * @param k key
     * @returns values (null if not found)
     */
    get(k: string) {
        let v = this.cache[k]
        return v === undefined ? null : v
    }
}

export default Cache