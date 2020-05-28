if (typeof define !== 'function') {
    var define = require('amdefine')(module);

    atob = require("atob");
    btoa = require("btoa");
    CryptoJS = require("crypto-js");
    request = require("request")

}

define(["events"],function (events) {
    var $$self = function () {
        
        var d2botConfig = {
            host: "http://localhost:8080",
            username: "public",
			fastQuery: true
        };
		
		var requests = [];
        
        var makePostRequest;
        
        function $D2BotAPI(){}
        
        $D2BotAPI.prototype = new events.EventEmitter()
        
        var D2BotAPI = new $D2BotAPI();
        window.API = D2BotAPI;
        var $get = function (requestObject, done, fail, count) {
            if (!count) count = 0;
            if (count >= 3) {
                if(!fail)
                return fail("failed 3 times invalid session");
            }
            var self = this;
            if (!requestObject.profile) requestObject.profile = d2botConfig.username;
            if (!requestObject.session || requestObject.session == "null") requestObject.session = d2botConfig.session || 'null';

            var thejson = JSON.stringify(requestObject);
            var Base64blob = base64encode(JSON.stringify(requestObject));//Buffer.from(JSON.stringify(requestObject)).toString('base64');
            //console.log("---------------------");
            //console.log(thejson);
            //console.log(Base64blob);

            makePostRequest(d2botConfig, requestObject.func, Base64blob, function (err, results) {
                //console.log(err,results);
                if (err){
                    if (done) done(err);
                    return fail(err);  
                } 
                results = base64decode(results);
                //console.log(results)
                if (results == "") return fail("Unknown Server response");
                var $res = JSON.parse(results);
                //'{"request":"accounts","status":"failed","body":"invalid user"}'
                if (done) done($res);
            });
        };
        
        D2BotAPI.$get = $get;
        
        D2BotAPI.on("doAuth",function(done){
            doAuth(done);
        });
        
        D2BotAPI.on("encrypt",function(data, pw, done){
            done(null, encrypt(data, pw))
        })
        
        D2BotAPI.on("decrypt",function(data, pw, done){
            done(null, decrypt(data, pw))
        })
        
        D2BotAPI.md5 = function(data,done){
            var md5 = CryptoJS.MD5(data);
            if(done)
                done(null,md5);
            return md5;
        }

        D2BotAPI.on("put",function(folder, file, data, pw, done){
            D2BotAPI.emit("encrypt",data, pw, function(err,$data){
                $get({ func: "put", args: [folder, file, $data] }, function (err,msg) {
                    done(null, msg);
                }, function (textStatus) {
                    done(textStatus);
                });
            })
        })
        
        D2BotAPI.on("get",function(filePath,done){
            $get({ func: "get", args: [filePath] }, function (msg) {
                if (msg.status != "success") {
                    return done(msg.status, msg.body)
                }else{
                    done(null, msg.body);
                }
            }, function (textStatus) {
                done(textStatus);
            });
        })
        
        D2BotAPI.on("login",function(username,password,server,callback){
            d2botConfig.username = username;
			d2botConfig.host = server;

            D2BotAPI.emit("challenge",function (err, msg) {
				if (err) {
					callback(err, null);
                } else if (msg.status == "success") {
                    d2botConfig.session = encrypt(msg.body, password);
                    callback(null, d2botConfig.session);
                } else {
                    let params = `toolbar=no,menubar=no,width=600,height=500,left=100,top=100`;
                    /*setTimeout(() => {
                        let popup = window.open(server, "register certificate", params);
                        popup.focus();
                        var timer = setInterval(() => {   
                            if(popup.closed) {  
                                clearInterval(timer);  
                                alert('Hope you added certificate to browser..\nPage will be reoladed now!');  
                                location.reload();
                            }  
                        }, 1000); 
                    }, 200);*/
                }
            });
        })

        D2BotAPI.on("accounts",function(account,done){
            var args = [];
            if (account) args.push(account);
            $get({ func: "accounts", args: args }, function (msg) {
                if (msg.status == "success") {
                    done(null, JSON.parse(msg.body));
                }
                else {
                    done(null,msg);
                }
            }, function (textStatus) {
                done(textStatus);
            });
        });
        
        D2BotAPI.on("profiles",function(done){
            $get({ func: "profiles", args: [] }, function (msg) {
                if (msg.status == "success") {
                    done(null, JSON.parse(msg.body));
                }
                else {
                    done(msg);
                }
            }, function (textStatus) {
                done(textStatus);
            });
        });

        D2BotAPI.on("query",function(item, realm, account, charname, done){
            var args = [];
            if (item) args.push(item);
            else args.push("");
            if (realm) args.push(realm);
            else args.push("");
            if (account) args.push(account); //else args.push("");
            if (charname) args.push(charname); //else args.push("");
            $get({ func: "query", args: args }, function (msg) {
                if (msg.status == "success") {
                    done(null, JSON.parse(msg.body));
                }
                else {
                    console.log("status: " + msg);//done(null,msg);
                }
            }, function (textStatus) {
                done(textStatus);
            });
        });
		
		D2BotAPI.on("fastQuery",function(item, realm, account, charname, done){
            var args = [];
            if (item) args.push(item);
            else args.push("");
            if (realm) args.push(realm);
            else args.push("");
            if (account) args.push(account); //else args.push("");
            if (charname) args.push(charname); //else args.push("");
            $get({ func: d2botConfig.fastQuery?"fastQuery":"query", args: args }, function (msg) {
                if (msg.status == "success") {
                    done(null, JSON.parse(msg.body));
                }
                else {
                    console.log("status: " + JSON.stringify(msg));//done(null,msg);
                }
            }, function (textStatus) {
                if(d2botConfig.fastQuery) {
                    console.warn("Old D2Bot# version active or no API server running..","Using deprecated API.");
                    d2botConfig.fastQuery = false;
                    D2BotAPI.emit("query", item, realm, account, charname, done);
                } else {
                    done(textStatus);
                }
            });
        });
        
        D2BotAPI.on("start", function (profile, tag, done) {
            var req = { func: "start", args: [profile, tag] };
            $get(req, function (msg) {
                done(null, msg);
            }, function (textStatus) {
                done(textStatus);
            });
        });
        
        D2BotAPI.on("stop", function (profile, done) {
            var req = { func: "stop", args: [profile] };
            console.logout(req);
            $get(req, function (msg) {
                done(null, msg);
            }, function (textStatus) {
                done(textStatus);
            });
        });
        
        D2BotAPI.on("challenge", function (done) {
            $get({ func: "challenge", args: [""] }, function (msg) {
                done(null, msg);
            }, function (textStatus) {
                done(textStatus);
            });
        });
        
        D2BotAPI.on("PING",function(done){
            $get({ func: "PING", args: [] }, function (msg) {
                done(null, msg);
            }, function (textStatus) {
                done(textStatus);
            });
        })
        
        D2BotAPI.on("poll",function(done){
            API.$get({ func: "poll", args: [] }, function (msg) {
                done(null, msg);
            }, function (textStatus) {
                done(textStatus);
            });
        })
        
        D2BotAPI.on("setTag",function(profile, tag, done){
            $get({ func: "setTag", args: [profile, tag] }, function (msg) {
                done(null, msg);
            }, function (textStatus) {
                done(textStatus);
            });
        })
        
        D2BotAPI.on("gameaction",function(data, done){
            $get({ func: "gameaction", args: [data.hash, JSON.stringify(data)] }, function (msg) {
                done(null, msg);
            }, function (textStatus) {
                done(textStatus);
            });
        })

        D2BotAPI.on("validate", function (username, session, server, callback) {
            d2botConfig.username = username;
            d2botConfig.session = session;
			d2botConfig.host = server;
            $get({ func: "validate", args: [] }, function (msg) {
                callback(null, msg.status == "success" ? true : false);
            }, function (textStatus) {
                callback(textStatus);
            });
        })
        
        D2BotAPI.on("registerEvent",function(type, done){
            var self = this;
            var args = [type, d2botConfig.host + "/api"];
            $get({ func: "registerEvent", args: args }, function (msg) {
                if (msg.status == "success") {
                    if (done)
                        done(null, msg);
                    else {
                        console.log(msg.body, type)
                    }
                }
                else {
                    if (done)
                        done(msg);
                }
            }, function (textStatus) {
                done(textStatus);
            });
        })
		
        D2BotAPI.cancelRequests = function(funcs) {
			console.log(requests);
            requests = requests.filter(req => {
                if (funcs.indexOf(req.func) < 0) return true;
                req.obj.abort();
                return false;
            });
        };
        
        makePostRequest = function makePostRequest_jquery(d2botConfig, func, data, callback) {
            var $request = {
                url: d2botConfig.host + "/api",// + Base64blob,
                type: "POST",
                /*timeout: 5000,*/ // <- Appears to be a bad idea :)
				/*headers: {
					'Content-Type':'text/plain'
				},*/
				crossDomain: true,
                dataType: "text",
                data:data
            };
			
            var request = {func:func, obj:$.ajax($request)};
			requests.push(request);
			
			request.obj.always(() => {
				requests.splice(requests.indexOf(request), 1);
			});
			
            request.obj.done(function(msg) {
                if (callback) callback(null, msg);
            });
            request.obj.fail(function(jqXHR, textStatus, errorThrown) {
                var msg = '';
                if (jqXHR.status === 0) {
                    msg = 'Not connected.\n Verify Network.';
                } else if (jqXHR.status == 404) {
                    msg = 'Requested page not found. [404]';
                } else if (jqXHR.status == 500) {
                    msg = 'Internal Server Error [500].';
                } else if (textStatus === 'parsererror') {
                    msg = 'Requested JSON parse failed.';
                } else if (textStatus === 'timeout') {
                    msg = 'Ajax request timed out.';
                } else if (textStatus === 'abort') {
                    msg = 'Ajax request aborted.';
                } else {
                    msg = 'Uncaught Error.\n' + jqXHR.responseText;
                }
                if (callback) callback(msg, null);
            });
        };

        var doAuthCallStack = [];
        var doingAuth = false;
        function doAuth(done) {
            doAuthCallStack.push(done);
            if(!doingAuth){
                doingAuth = true;
                D2BotAPI.emit("challenge",function (err, challenge) {
                    doingAuth = false;
                    while(doAuthCallStack.length)
                        doAuthCallStack.shift()();
                    SessionKey = encrypt(challenge.body, d2botConfig.session);
                    //done();
                });
            }
        }
        
        function base64encode(string){
            return Base64.encode(string);
        }
        
        function base64decode(string) {
            return Base64.decode(string);
        }
        
        function encrypt(msg, pass) {
            var keySize = 256;
            var ivSize = 128;
            var saltSize = 256;
            var iterations = 1000;            
            var salt = CryptoJS.lib.WordArray.random(saltSize / 8);
            var key = CryptoJS.PBKDF2(pass, salt, {
                keySize: keySize / 32,
                iterations: iterations
            });
            var iv = CryptoJS.lib.WordArray.random(ivSize / 8);
            var encrypted = CryptoJS.AES.encrypt(msg, key, {
                iv: iv,
                padding: CryptoJS.pad.Pkcs7,
                mode: CryptoJS.mode.CBC
            });
            var encryptedHex = base64ToHex(encrypted.toString());
            var base64result = hexToBase64(salt + iv + encryptedHex);
            return base64result;
        }

        function decrypt(transitmessage, pass) {
            var keySize = 256;
            var ivSize = 128;
            var saltSize = 256;
            var iterations = 1000;            
            var hexResult = base64ToHex(transitmessage)
            var salt = CryptoJS.enc.Hex.parse(hexResult.substr(0, 64));
            var iv = CryptoJS.enc.Hex.parse(hexResult.substr(64, 32));
            var encrypted = hexToBase64(hexResult.substring(96));
            var key = CryptoJS.PBKDF2(pass, salt, {
                keySize: keySize / 32,
                iterations: iterations
            });
            var decrypted = CryptoJS.AES.decrypt(encrypted, key, {
                iv: iv,
                padding: CryptoJS.pad.Pkcs7,
                mode: CryptoJS.mode.CBC
            });
            return decrypted.toString(CryptoJS.enc.Utf8);
        }

        function hexToBase64(str) {
            return btoa(String.fromCharCode.apply(null, str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" ")));
        }

        function base64ToHex(str) {
            for (var i = 0, bin = atob(str.replace(/[ \r\n]+$/, "")), hex = []; i < bin.length; ++i) {
                var tmp = bin.charCodeAt(i).toString(16);
                if (tmp.length === 1) tmp = "0" + tmp;
                hex[hex.length] = tmp;
            }
            return hex.join("");
        }

        return D2BotAPI;
    }
    
    return $$self;
});