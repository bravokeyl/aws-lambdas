module.exports = {
    port        : 8000,
    timeout     : 60000, // millisecond,
    save_html   : true, // save result to html file result.html, for checking result if something goes wrong
    use_proxy   : false,
    proxies     : [
        {
            host : '',
            port : '8080',
            type : 'http'   // http/https/socks5/socks4,
            //if require authentication
            // user : username,
            // pass : password
        },
        {
            host : '',
            port : '80',
            type : 'http'
        }
    ],
    repeat      : 3 // if error
}
