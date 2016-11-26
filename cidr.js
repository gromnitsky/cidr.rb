'use strict';

let cidr = {};

(function(exports) {
    let byte_string = function(n) {
	if (n < 0 || n > 255 || n % 1 !== 0)
	    throw new Error(n + " doesn't fit in 1 byte")
	return ("000000000" + n.toString(2)).slice(-8)
    }

    // RFC6890: Special-Purpose IP Address Registries
    let special_addr_tbl = {
	'0.0.0.0/8': {
	    name: 'This host on this network',
	    attrs: 'S'
	},
	'10.0.0.0/8': {
	    name: 'Private-Use',
	    attrs: 'SDF'
	},
	'100.64.0.0/10': {
	    name: 'Shared Address Space',
	    attrs: 'SDF'
	},
	'127.0.0.0/8': {
	    name: 'Loopback',
	    attrs: ''
	},
	'169.254.0.0/16': {
	    name: 'Link Local',
	    attrs: 'SD'
	},
	'172.16.0.0/12': {
	    name: 'Private-Use',
	    attrs: 'SDF'
	},
	// we write it before /24, otherwise cidr.describe() won't match it
	'192.0.0.0/29 ': {
	    name: 'DS-Lite',
	    attrs: 'SDF'
	},
	'192.0.0.0/24': {
	    name: 'IETF Protocol Assignments',
	    attrs: ''
	},
	'192.0.2.0/24 ': {
	    name: 'Documentation (TEST-NET-1)',
	    attrs: ''
	},
	'192.88.99.0/24': {
	    name: '6to4 Relay Anycast',
	    attrs: 'SDFG'
	},
	'192.168.0.0/16': {
	    name: 'Private-Use',
	    attrs: 'SDF'
	},
	'198.18.0.0/15': {
	    name: 'Benchmarking',
	    attrs: 'SDF'
	},
	'198.51.100.0/24': {
	    name: 'Documentation (TEST-NET-2)',
	    attrs: ''
	},
	'203.0.113.0/24': {
	    name: 'Documentation (TEST-NET-3)',
	    attrs: ''
	},
	'240.0.0.0/4': {
	    name: 'Reserved',
	    attrs: ''
	},
	'255.255.255.255/32': {
	    name: 'Limited Broadcast',
	    attrs: 'D'
	}
    }

    // to four chunks of bytes: [[0,1,...], [0,1,...], [0,1,...], [0,1,...]]
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
		chunk.push(arr[cidx][idx] ^ 1)
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
	if (min > 255) {
	    // the IP was x.x.x.255
	    return [ip, ip]
	}
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

    let eq = function(ip1, ip2) {
	let equal = true
	chunks_map(ip1, ip2, (top, bottom) => {
	    if (top !== bottom) equal = false
	})
	return equal
    }

    exports.describe = function(ip, mask) {
	let net = exports.netaddr(ip, mask)
	let brd = exports.broadcast_addr(ip, mask)
	let cidr = exports.cidr(mask)

	let subtype = []
	if (eq(ip, net)) subtype.push('network')
	if (eq(ip, brd)) subtype.push('broadcast')

	for (let key in special_addr_tbl) {
	    let [ip_loop, cidr_loop] = key.split('/')
	    cidr_loop = parseInt(cidr_loop, 10)

	    if (cidr >= cidr_loop) {
		let net_loop = exports.netaddr(ip, exports.mask(cidr_loop))
		if (ip_loop === exports.ip2str(net_loop)) {
		    let val = special_addr_tbl[key]
		    subtype = [val.name]
		    if (val.attrs !== '') subtype.push(`attrs=${val.attrs}`)
		    return {
			type: 'Special-purpose',
			subtype: subtype.join(', '),
			link: key
		    }
		}
	    }
	}

	return {
	    type: 'Regular',
	    subtype: subtype.join(', '),
	}
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
	    let cidr = exports.cidr(mask)
	    if (!eq(mask, exports.mask(cidr))) throw new Error('invalid mask')
	    return {
		cidr,
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

    class Geo {
	constructor(url_params) {
	    this.debug = url_params.get('debug')
	}

	template() {
	    return ['<details id="cidr-calc__geo">',
		    '<summary>Geographic information</summary>',
		    '<div>Wait please...</div>',
		    '</details>'].join("\n")
	}

	render(data) {
	    // we ought to validate `data` here but we implicitly
	    // "trust" ipinfo.io & this is a pet app, so...
	    let t = ['<table><tbody>']
	    let row = function(name, item, callback) {
		if (!item) return
		t.push(`<tr><td>${name}</td> <td>${callback(item)}</td></tr>`)
	    }
	    row('Hostname', data.hostname, (item) => item)
	    row('City', data.city, (item) => item)
	    row('Region', data.region, (item) => item)
	    row('Country', data.country, (item) => item)
	    row('Coordinates', data.loc, (item) => {
		let zoom = 5
		return `<code>${item}</code> <a target="_blank" href='https://maps.google.com/?q=${item}&ll=${item}&z=${zoom}'>Google maps</a>`
	    })
	    row('Organization', data.org, (item) => item)

	    if (t.length === 1) throw new Error('no useful data in the payload')
	    t.push('</table></tbody>')
	    return t.join("\n")
	}

	hook(ip) {
	    let details = document.querySelector('#cidr-calc__geo')
	    if (!details) return
	    let was_opened = false

	    details.addEventListener('toggle', () => {
		if (was_opened) return
		was_opened = true

		let node = details.querySelector('div')
		this.fetch(ip).then( r => {
	    	    node.innerHTML = this.render(r)
	    	}).catch( err => {
		    node.innerHTML = `<b>Error:</b> ${err.message}<br>Refresh (<kbd>Ctrl-r</kbd>) the page & try again.`
		})
	    })
	}

	fetch(ip) {
	    switch (this.debug) {
	    case '1': return Promise.reject(new Error('fail on purpose'))
	    case '2': return Promise.resolve({
		ip,
		hostname: `${ip}.debug.example.com`,
		city: "Kiev",
		region: "Kyiv City",
		country: "UA",
		loc: "50.4333,30.5167",
		org: "AS6849 PJSC Ukrtelecom"
	    })
	    case '3': return Promise.resolve({
		ip,
		bogon: true
	    })
	    default: return fetch(`http://ipinfo.io/${ip}/json`)
		    .then( r => r.json())
	    }
	}
    }

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
	let url = function(url_search_params) {
	    return `#/?${url_search_params}`
	}
	let link = function(to) {
	    let hash = new URLSearchParams(url_params.toString())
	    hash.set('q', to)
	    return `<a href="${url(hash)}">${to}</a>`
	}

	row('CIDR', r.cidr)
	row('Mask', link(cidr.ip2str(r.mask)), bits(r.mask))
	row('Max hosts', cidr.maxhosts(r.cidr).toLocaleString('en-US'))

	let ip
	let geo = new Geo(url_params)
	if (r.ip) {
	    let desc = cidr.describe(r.ip, r.mask)
	    if (desc.type !== 'Regular') desc.type = `<b>${desc.type}</b>`
	    if (desc.link) desc.subtype += ', ' + link(desc.link)
	    row('Type', desc.type, desc.subtype)

	    ip = cidr.ip2str(r.ip)
	    row('Address', ip, bits(r.ip))

	    if (desc.type === 'Regular') {
		templ.push('<tr><td colspan=3>')
		templ.push(geo.template())
		templ.push('</td></tr>')
	    }

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
	geo.hook(ip)

	// upd location after successful rendering only
	if (query !== url_params.get('q')) {
	    url_params.set('q', query)
	    window.history.pushState('omglol', 'cidr.rb', url(url_params))
	}
    }

    document.addEventListener('DOMContentLoaded', () => {
	let params = new URLSearchParams(location.hash.slice(2))
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
	window.addEventListener("hashchange", _unused => {
	    params = new URLSearchParams(location.hash.slice(2))
	    input.value = params.get('q')
	    calc(params)
	})
    })
}
