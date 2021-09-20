class Logger {
    log(...messages: any[]) {
        console.log(...messages)
    }

    debug(...messages: any[]){
        console.debug(...messages)
    }
}

export default Logger