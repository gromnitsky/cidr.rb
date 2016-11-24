'use strict';

let cidr = {};

(function(exports) {
    let byte_string = function(n) {
	if (n < 0 || n > 255 || n % 1 !== 0)
	    throw new Error(n + " doesn't fit in 1 byte")
	return ("000000000" + n.toString(2)).slice(-8)
    }

    // fcb - four chunks of bytes
    exports.str2ip = function(ip) {
	return ip.split('.')
	    .map( val => byte_string(parseInt(val, 10))
		  .split('').map( ch => parseInt(ch, 2)))
    }

    exports.ip2str = function(arr) {
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
	return chunks_map(ip, mask, (top, bottom) => {
	    return top & bottom
	})
    }

    exports.ip_invert = function(arr) {
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
	return chunks_map(ip, exports.ip_invert(mask), (top, bottom) => {
	    return top | bottom
	})
    }

    exports.hostaddr = function(ip, mask) {
	return chunks_map(ip, exports.ip_invert(mask), (top, bottom) => {
	    return top & bottom
	})
    }

    exports.mask = function(cidr) {
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

    exports.cidr = function(mask) {
	let flatten = [].concat.apply([], mask)
	return flatten.reduce( (prev, cur) => prev + cur, 0)
    }

    exports.maxhosts = function(cidr) {
	return Math.pow(2, (32 - cidr)) - 2
    }

    exports.hosts_range = function(ip, mask) {
	let first = exports.netaddr(ip, mask)
	let min = parseInt(first[3].join(''), 2) + 1
	first[3] = exports.str2ip(min.toString())[0]

	let last = exports.broadcast_addr(ip, mask)
	let max = parseInt(last[3].join(''), 2) - 1
	last[3] = exports.str2ip(max.toString())[0]

	return [first, last]
    }

    exports.cidr_max = function(ip1, ip2) {
	let in_common = true
	let n = 0
	chunks_map(ip1, ip2, (top, bottom) => {
	    if (in_common && top === bottom) {
		++n
	    } else {
		in_common = false
	    }
	})
	return n
    }

    exports.query_parse = function(query) {
	query = query.replace(/\s+/g, ' ').trim()
	let m

	// /16
	if ((m = query.match(/^\/?(\d+)$/)) ) {
	    let cidr = parseInt(m[1], 10)
	    return {
		cidr,
		mask: exports.mask(cidr)
	    }
	}

	// 255.255.0.0
	if ((m = query.match(/^\d+\.\d+\.\d+\.\d+$/)) ) {
	    let mask = exports.str2ip(query)
	    return {
		cidr: exports.cidr(mask),
		mask
	    }
	}

	// 192.168.1.1 255.255.0.0
	if ((m = query.match(/^(\d+\.\d+\.\d+\.\d+) (\d+\.\d+\.\d+\.\d+)$/)) ) {
	    let mask = exports.str2ip(m[2])
	    return {
		cidr: exports.cidr(mask),
		mask,
		ip: exports.str2ip(m[1]),
	    }
	}

	// 192.168.1.1/30
	if ((m = query.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/)) ) {
	    let cidr = parseInt(m[2], 10)
	    return {
		cidr,
		mask: exports.mask(cidr),
		ip: exports.str2ip(m[1]),
	    }
	}

	// 128.42.5.17 ~ 128.42.5.67
	if ((m = query.match(/^(\d+\.\d+\.\d+\.\d+) ?~ ?(\d+\.\d+\.\d+\.\d+)$/)) ) {
	    let cidr = exports.cidr_max(exports.str2ip(m[1]),
					exports.str2ip(m[2]))
	    return {
		cidr,
		mask: exports.mask(cidr),
		ip: exports.str2ip(m[1])
	    }
	}

	throw new Error('incomplete query')
    }

})(typeof exports === 'object' ? exports : cidr)

/* main */
if (typeof window === 'object') {
    let calc = function(url_params) {
	let r
	let out = document.getElementById('cidr-calc__result')
	let query = document.getElementById('cidr-calc__input').value
	try {
	    r = cidr.query_parse(query)
	} catch (err) {
	    out.innerHTML = `<b>Error:</b> ${err.message}`
	    return
	}

	let templ = ['<table><tbody>']

	let bits = function(arr) {
	    return '<code>' + arr.map( val => val.join('')).join(' ') + '</code>'
	}
	let row = function() {
	    let args = Array.prototype.slice.call(arguments)
	    let t = ['<tr>']
	    args.forEach( val => t.push(`<td>${val}</td>`))
	    t.push('</tr>')
	    templ.push(t.join("\n"))
	}

	row('CIDR', r.cidr)
	row('Mask', cidr.ip2str(r.mask), bits(r.mask))
	row('Max hosts', cidr.maxhosts(r.cidr).toLocaleString('en-US'))

	if (r.ip) {
	    row('Address', cidr.ip2str(r.ip), bits(r.ip))

	    let net = cidr.netaddr(r.ip, r.mask)
	    row('Network', cidr.ip2str(net), bits(net))

	    let brd = cidr.broadcast_addr(r.ip, r.mask)
	    row('Broadcast', cidr.ip2str(brd), bits(brd))

	    let host = cidr.hostaddr(r.ip, r.mask)
	    row('Host', cidr.ip2str(host), bits(host))

	    let range = cidr.hosts_range(r.ip, r.mask)
	    row('Begin', cidr.ip2str(range[0]))
	    row('End', cidr.ip2str(range[1]))
	}

	templ.push('</table></tbody>')
	out.innerHTML = templ.join("\n")

	// upd location after successful rendering only
	url_params.set('q', query)
	location.hash = '#' + url_params
    }

    document.addEventListener('DOMContentLoaded', () => {
	let params = new URLSearchParams(location.hash.slice(1))
	let input = document.getElementById('cidr-calc__input')
	input.addEventListener('keydown', (evt) => {
	    if (evt.keyCode === 13) calc(params)
	})
	document.getElementById('cidr-calc__submit')
	    .onclick = () => calc(params)

	if (params.get('q')) {
	    input.value = params.get('q')
	    calc(params)
	}
    })
}
