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

    let chunks_map = function(arr1, arr2, cb) {
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
	let r = chunks_map(ip_chunks, mask_chunks, (top, bottom) => {
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
	let r = chunks_map(ip_chunks, mask_chunks_inverted, (top, bottom) => {
	    return top | bottom
	})
	return exports.fcb_to_ip(r)
    }

    exports.hostaddr = function(ip, mask) {
	let ip_chunks = exports.ip_to_fcb(ip)
	let mask_chunks_inverted = exports.fcb_invert(exports.ip_to_fcb(mask))
	let r = chunks_map(ip_chunks, mask_chunks_inverted, (top, bottom) => {
	    return top & bottom
	})
	return exports.fcb_to_ip(r)
    }

    exports.mask_fcb = function(cidr) {
	if (cidr < 0 || cidr > 32) throw new Error("invalid value for cidr")
	let bits = Array(cidr).fill(1)
	let zeros = Array(32 - bits.length).fill(0)
	let arr = bits.concat(zeros)
	let r = []
	let chunk = []
	for (let idx = 0; idx < arr.length; ++idx) {
	    if (idx % 8 === 0) {
		if (idx !== 0) r.push(chunk)
		chunk = []
	    }
	    chunk.push(arr[idx])
	}
	r.push(chunk)
	return r
    }

    exports.cidr = function(mask_fcb) {
	let flatten = [].concat.apply([], mask_fcb)
	return flatten.reduce( (prev, cur) => prev + cur, 0)
    }

    exports.maxhosts = function(cidr) {
	return Math.pow(2, (32 - cidr)) - 2
    }

    exports.hosts_range = function(ip, cidr) {
	let fcb = exports.ip_to_fcb(ip)
	let last = parseInt(fcb[3].join(''), 2) + exports.maxhosts(cidr) - 1
	fcb[3] = exports.ip_to_fcb(last.toString())[0]
	return [ip, exports.fcb_to_ip(fcb)]
    }

    exports.parse_query = function(query) {
	query.replace(/\s+/, ' ').trim()
	let m

	// /16
	if ((m = query.match(/^\/?(\d+)$/)) ) {
	    return { cidr: parseInt(m[1], 10) }
	}

	// 255.255.0.0
	if ((m = query.match(/^\d+\.\d+\.\d\.\d+$/)) ) {
	    return { mask: query }
	}

	// 192.168.1.1 255.255.0.0
	if ((m = query.match(/^(\d+\.\d+\.\d+\.\d) (\d+\.\d+\.\d\.\d+)$/)) ) {
	    return {
		ip: m[1],
		mask: m[2]
	    }
	}

	// 192.168.1.1/30
	if ((m = query.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/)) ) {
	    return {
		ip: m[1],
		cidr: parseInt(m[2], 10)
	    }
	}

	throw new Error('incomplete query')
    }

})(typeof exports === 'object' ? exports : cidr)
