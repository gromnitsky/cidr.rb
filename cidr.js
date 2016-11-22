'use strict';

let cidr = {};

(function(exports) {
    let byte_string = function(n) {
	if (n < 0 || n > 255 || n % 1 !== 0)
	    throw new Error(n + " doesn't fit in 1 byte")
	return ("000000000" + n.toString(2)).slice(-8)
    }

    // fcb - four chunks of bytes
    exports.ip_to_fcb = function(ip) {
	return ip.split('.')
	    .map( val => byte_string(parseInt(val, 10))
		  .split('').map( ch => parseInt(ch, 2)))
    }

    exports.fcb_to_ip = function(arr) {
	return arr.map( val => parseInt(val.join(''), 2)).join('.')
    }

    let chunks_each = function(arr1, arr2, cb) {
	let r = []
	for (let cidx=0; cidx < arr1.length; ++cidx) {
	    let chunk = []
	    for (let idx=0; idx < arr1[cidx].length; ++idx) {
		chunk.push(cb(arr1[cidx][idx], arr2[cidx][idx]))
	    }
	    r.push(chunk)
	}
	return r
    }

    exports.netaddr = function(ip, mask) {
	let ip_chunks = exports.ip_to_fcb(ip)
	let mask_chunks = exports.ip_to_fcb(mask)
	let r = chunks_each(ip_chunks, mask_chunks, (top, bottom) => {
	    return top & bottom
	})
	return exports.fcb_to_ip(r)
    }

    exports.fcb_invert = function(arr) {
	let r = []

	for (let cidx=0; cidx < arr.length; ++cidx) {
	    let chunk = []
	    for (let idx=0; idx < arr[cidx].length; ++idx) {
		chunk.push(Number(!arr[cidx][idx]))
	    }
	    r.push(chunk)
	}
	return r
    }

    exports.broadcast_addr = function(ip, mask) {
	let ip_chunks = exports.ip_to_fcb(ip)
	let mask_chunks_inverted = exports.fcb_invert(exports.ip_to_fcb(mask))
	let r = chunks_each(ip_chunks, mask_chunks_inverted, (top, bottom) => {
	    return top | bottom
	})
	return exports.fcb_to_ip(r)
    }

    exports.hostaddr = function(ip, mask) {
	let ip_chunks = exports.ip_to_fcb(ip)
	let mask_chunks_inverted = exports.fcb_invert(exports.ip_to_fcb(mask))
	let r = chunks_each(ip_chunks, mask_chunks_inverted, (top, bottom) => {
	    return top & bottom
	})
	return exports.fcb_to_ip(r)
    }

})(typeof exports === 'object' ? exports : cidr)
