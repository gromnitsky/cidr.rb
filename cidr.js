'use strict';

let cidr = {};

(function(exports) {
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
	// we write it before /24, otherwise Net#describe() won't match it
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
	'255.255.255.255/32': {
	    name: 'Limited Broadcast',
	    attrs: 'D'
	},
	'240.0.0.0/4': {
	    name: 'Reserved',
	    attrs: ''
	}
    }

    let byte_str = function(n) {
	if (n < 0 || n > 255 || n % 1 !== 0)
	    throw new Error(n + " doesn't fit in 1 byte")
	return ("000000000" + n.toString(2)).slice(-8)
    }

    class IPv4 {
	constructor(spec) {
	    if (Number.isInteger(spec)) {
		this.addr = spec
	    } else if (spec instanceof IPv4) {
		this.addr = spec.addr
	    } else {
		// DDN (dot-decimal notation)
		this.addr = parseInt(spec.split('.')
				     .map( val => byte_str(parseInt(val, 10)))
				     .join(''), 2)
	    }
	    if (this.addr < IPv4.MIN || this.addr > IPv4.MAX)
		throw new Error(`integer doesn't fit in [${IPv4.MIN}...${IPv4.MAX}] range: ${this.addr}`)
	}

	valueOf() {
	    return this.addr
	}

	eq(to) {
	    if (!to && to !== 0) return false // 0 is '0.0.0.0'
	    return this.addr === (new IPv4(to)).addr
	}

	_arr() {
	    let a = (this.addr & (0xff << 24)) >>> 24
	    let b = (this.addr & (0xff << 16)) >>> 16
	    let c = (this.addr & (0xff << 8)) >>> 8
	    let d = this.addr & 0xff
	    return [a, b, c, d]
	}

	toString() {
	    return this._arr().join('.')
	}

	inspect() {
	    return `#<${this.constructor.name}: ${this}>`
	}

	to_a() {
	    return this._arr().map( val => byte_str(val)
				    .split('')
				    .map( bit => parseInt(bit, 10)))
	}

	reverse() {
	    return [0,1,2,3].map( val => (this.addr >> (8 * val)) & 0xff)
		.join('.') + '.in-addr.arpa'
	}
    }
    IPv4.MIN = 0
    IPv4.MAX = 0xffffffff
    exports.IPv4 = IPv4

    class Net {
	constructor(ip, mask_or_cidr) {
	    if (ip instanceof Net) {
		this.ip = ip.ip
		this.cidr = ip.cidr
		this.mask = ip.mask
		return
	    }

	    this.ip = new IPv4(ip)

	    if (Number.isInteger(mask_or_cidr)) {
		this.cidr = mask_or_cidr
		this.mask = Net.Mask(this.cidr)

	    } else if (typeof mask_or_cidr === 'string') {
		if (mask_or_cidr.match(/^\d+\.\d+\.\d+\.\d+$/)) {
		    this.mask = new IPv4(mask_or_cidr)
		    this.cidr = Net.Cidr(this.mask)
		} else {
		    this.cidr = Net.parseCidr(mask_or_cidr)
		    this.mask = Net.Mask(this.cidr)
		}

	    } else {
		this.mask = mask_or_cidr // IPv4 obj
		if (!this.mask) {
		    let ok = false
		    if (typeof ip === 'string') { // ip was in a CIDR notation
			let spec = ip.split('/')[1]
			if (spec !== undefined) {
			    ok = true
			    this.mask = Net.Mask(spec)
			}
		    }
		    if (!ok) throw new Error('CIDR is missing')
		}
		this.cidr = Net.Cidr(this.mask)
	    }
	}

	// String -> Number
	// Number -> Number
	static parseCidr(spec) {
	    let r = parseInt(spec, 10)
	    if (isNaN(r) || r < 0 || r > 32)
		throw new Error(`invalid CIDR: ${r}`)
	    return r
	}

	// String -> IPv4
	// Number -> IPv4
	static Mask(cidr) {
	    cidr = Net.parseCidr(cidr)
	    let ones = Array(cidr).fill(1)
	    let zeros = Array(32 - ones.length).fill(0)
	    let dec = parseInt(ones.concat(zeros).join(''), 2)
	    return new IPv4(dec)
	}

	// IPv4 -> Number
	static Cidr(mask) {
	    let flatten = [].concat.apply([], mask.to_a())
	    let cidr = flatten.reduce( (prev, cur) => prev + cur, 0)
	    if (!mask.eq(Net.Mask(cidr)))
		throw new Error(`invalid mask: ${mask}`)
	    return cidr
	}

	toString() {
	    return this.ip.toString() + '/' + this.cidr
	}

	valueOf() {
	    return this.netaddr()
	}

	eq(to) {
	    if (!to) return false
	    to = new Net(to)
	    return (this.ip.eq(to.ip)) && (this.cidr === to.cidr)
	}

	inspect() {
	    return `#<${this.constructor.name}: ${this}>`
	}

	netaddr() {
	    return new IPv4((this.ip & this.mask) >>> 0)
	}

	_brd() {
	    return (this.ip | ~this.mask) >>> 0
	}

	broadcast() {
	    return this.cidr <= 30 ? new IPv4(this._brd()) : null
	}

	hostaddr() {
	    return new IPv4((this.ip & ~this.mask) >>> 0)
	}

	maxhosts() {
	    let mh = Net.Maxhosts(this.cidr)
	    return mh >= 0 ? mh : 0
	}

	static Maxhosts(cidr) {
	    return Math.pow(2, (32 - cidr)) - 2
	}

	range() {
	    if (cidr === 32) return null

	    let first = this.cidr <= 30 ? this.netaddr() + 1 : this.netaddr()
	    let last = this.cidr <= 30 ? this._brd() - 1 : this._brd()
	    return [new IPv4(first), new IPv4(last)]
	}

	static Cidr_max(ip1, ip2) {
	    let arr1 = [].concat.apply([], ip1.to_a())
	    let arr2 = [].concat.apply([], ip2.to_a())
	    let n = 0
	    for (let idx = 0; idx < arr1.length; ++idx) {
		if (arr1[idx] === arr2[idx]) {
		    ++n
		} else {
		    break
		}
	    }
	    return n
	}

	describe() {
	    let subtype = []
	    if (this.ip.eq(this.netaddr())) subtype.push('network')
	    if (this.ip.eq(this.broadcast())) subtype.push('broadcast')

	    for (let key in special_addr_tbl) {
		if (new Net(key).includes(this)) {
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

	    return {
		type: 'Regular',
		subtype: subtype.join(', '),
	    }
	}

	vlsm(hosts) {
	    if (this.cidr < 4 || this.cidr > 30)
		throw new Error('the valid range for cird is [4...30]')
	    if (!this.ip.eq(this.netaddr()))
		throw new Error(`invalid network address: ${this.ip}`)

	    hosts = Array.from(hosts).filter( val => val > 0)
	    if (!hosts.length) throw new Error('invalid subnet spec')
	    hosts = hosts.sort((a, b) => b - a)

	    function cidr_max(hosts_in_net) {
		for (let idx = 2; idx <= 32; ++idx) {
		    if ((Math.pow(2, idx) - 2) >= hosts_in_net) {
			return 32 - idx
		    }
		}
		throw new Error(`${hosts_in_net} is too big`)
	    }

	    let result = {
		error: null,
		tbl: []
	    }
	    let addrs_max = this.maxhosts() + 2
	    let addrs_used = 0
	    let idx
	    let ip_loop = this.ip
	    for (idx = 0; idx < hosts.length; ++idx) {
		let nhosts = hosts[idx]
		let cidr_loop = cidr_max(nhosts)
		addrs_used += Net.Maxhosts(cidr_loop) + 2
		if (addrs_used > addrs_max) break

		let net = new Net(new IPv4(ip_loop), cidr_loop)
		let range = net.range()
		result.tbl.push({
		    nhosts,
		    net
		})

		ip_loop = range[1] + 2
	    }

	    if (idx !== hosts.length)
		result.error = `some of subnets didn't fit in: ${hosts.slice(idx)}`

	    return result
	}

	to_iter() {
	    let range = this.range()
	    let ip = range[0]
	    let gen = function*() {
		while (ip <= range[1]) {
		    yield new IPv4(ip++)
		}
	    }
	    return gen()
	}

	includes(spec) {
	    let net
	    try {
		net = new Net(spec)
	    } catch (_unused) {
		return this.netaddr().eq(new Net(spec, this.cidr).netaddr())
	    }
	    if (this.cidr > net.cidr) return false
	    return this.netaddr().eq(new Net(net.ip, this.cidr).netaddr())
	}
    }
    exports.Net = Net

    exports.query_parse = function(query) {
	query = query.replace(/\s+/g, ' ').trim()
	let m

	// /16
	if ((m = query.match(/^\/?(\d+)$/)) ) {
	    return {
		type: 'cidr',
		cidr: Net.parseCidr(m[1]),
		mask: Net.Mask(m[1])
	    }
	}

	// 255.255.0.0
	if ((m = query.match(/^\d+\.\d+\.\d+\.\d+$/)) ) {
	    let mask = new IPv4(query)
	    return {
		type: 'cidr',
		cidr: Net.Cidr(mask),
		mask
	    }
	}

	// 192.168.1.1 255.255.0.0
	if ((m = query.match(/^(\d+\.\d+\.\d+\.\d+) (\d+\.\d+\.\d+\.\d+)$/)) ) {
	    return {
		type: 'net',
		net: new Net(m[1], m[2])
	    }
	}

	// 192.168.1.1/30
	if ((m = query.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/)) ) {
	    return {
		type: 'net',
		net: new Net(m[0])
	    }
	}

	// 192.168.1.1/26 20,2,7,1
	if ((m = query.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+) ([0-9,]+)$/)) ) {
	    let hosts = m[3].split(',').map( val => parseInt(val, 10))
	    return {
		type: 'vlsm',
		net: new Net(m[1], m[2]),
		hosts
	    }
	}

	// 128.42.3.20 in 128.42.3.17/29
	// 128.42.3.20/29 in 128.42.3.17/29
	if ((m = query.match(/^(\d+\.\d+\.\d+\.\d+)(\/\d+)? in (\d+\.\d+\.\d+\.\d+)\/(\d+)$/)) ) {
	    return {
		type: 'net-contains',
		net: new Net(m[3], m[4]),
		q: m[1] + (m[2] || '')
	    }
	}

	// 128.42.5.17 ~ 128.42.5.67
	if ((m = query.match(/^(\d+\.\d+\.\d+\.\d+) ?~ ?(\d+\.\d+\.\d+\.\d+)$/)) ) {
	    let cidr = Net.Cidr_max(new IPv4(m[1]), new IPv4(m[2]))
	    return {
		type: 'net',
		net: new Net(m[1], cidr)
	    }
	}

	throw new Error('invalid query')
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
	    t.push('</tbody></table>')
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

    class Renderer {
	constructor(data, node, url_params) {
	    this.data = data
	    this.node = node
	    this.url_params = url_params

	    this.templ = []
	}

	finish() {
	    this.node.innerHTML = this.templ.join("\n")
	}

	row() {
	    let args = Array.prototype.slice.call(arguments)
	    let t = ['<tr>']
	    args.forEach( val => t.push(`<td>${val}</td>`))
	    t.push('</tr>')
	    this.templ.push(t.join("\n"))
	}

	static Url(url_search_params) {
	    return `#/?${url_search_params}`
	}

	link(to, text) {
	    let hash = new URLSearchParams(this.url_params.toString())
	    hash.set('q', to)
	    return `<a href="${Renderer.Url(hash)}">${text || to}</a>`
	}
    }

    class VlsmRenderer extends Renderer {
	constructor(data, node, url_params) {
	    super(data, node, url_params)
	}

	pad(ip) {
	    let n = 4*3 + 3
	    return (' '.repeat(n) + ip.toString()).slice(-n)
	}

	prelude(nets) {
	    this.templ.push(['<table><thead>',
			     '<tr>',
			     '<th></th>',
			     '<th></th>',
			     '<th colspan="3">IPs</th>',
			     '<th colspan="2">Subnets</th>',
			     '</tr>',
			     '<tr>',
			     '<th></th>',
			     '<th>Max hosts</th>',
			     '<th>Requested</th>',
			     '<th>Used</th>',
			     '<th>Wasted</th>',
			     '<th>Expected</th>',
			     '<th>Created</th>',
			     '</tr></thead><tbody>'].join("\n"))

	    let ip_wanted = this.data.hosts.reduce( (prev, cur) => {
		return prev + cur
	    }, 0)
	    let ip_used = nets.tbl.reduce( (prev, cur) => {
		return prev + cur.nhosts
	    }, 0)
	    let ip_wasted = nets.tbl.reduce( (prev, cur) => {
		return prev + cur.net.maxhosts() - cur.nhosts
	    }, 0)
	    let url = this.link(this.data.net)

	    this.row(url, this.data.net.maxhosts(),
		     ip_wanted, ip_used, ip_wasted,
		     this.data.hosts.length, nets.tbl.length)
	    this.templ.push('</tbody></table>')
	}

	start() {
	    let nets
	    try {
		nets = this.data.net.vlsm(this.data.hosts)
	    } catch (err) {
		this.templ.push(`<p><b>Error:</b> ${err.message}</p>`)
		this.finish()
		return
	    }

	    if (nets.error)
		this.templ.push(`<p><b>Error:</b> ${nets.error}</p>`)

	    this.prelude(nets)
	    if (!nets.tbl.length) {
		this.finish()
		return
	    }

	    this.templ.push('<br>')
	    this.templ.push(['<table><thead><tr>',
			     '<th title="Hosts requested">HR</th>',
			     '<th title="Hosts available">HA</th>',
			     '<th title="Hosts wasted">HW</th>',
			     '<th>Requested range</th>',
			     '<th>Network</th>',
			     '<th>Broadcast</th>',
			     '</tr></thead><tbody>'].join("\n"))

	    nets.tbl.forEach( val => {
		let row = ['<tr>']

		row.push(`<td>${val.nhosts}</td>`)
		let ha = val.net.maxhosts()
		row.push(`<td>${this.link(val.net.cidr, ha)}</td>`)
		row.push(`<td>${ha - val.nhosts}</td>`)
		let range = val.net.range()
		row.push(`<td class="cidr-calc--range">${this.pad(range[0])} — ${new cidr.IPv4(range[0] + val.nhosts - 1)}</td>`)
		row.push(`<td>${this.link(val.net)}</td>`)
		row.push(`<td>${val.net.broadcast()}</td>`)

		row.push('</tr>')
		this.templ.push(row.join("\n"))
	    })

	    this.templ.push('</tbody></table>')
	    this.finish()
	}
    }

    class IPRenderer extends Renderer {
	constructor(data, node, url_params) {
	    super(data, node, url_params)
	}

	static Bits(ip) {
	    if (!ip) return ''
	    let dec = ip._arr()
	    return '<code>' + ip.to_a()
		.map( (val, idx) =>
		      `<span title='${dec[idx]}'>${val.join('')}</span>`)
		.join(' ') + '</code>'
	}

	start() {
	    this.templ.push('<table><tbody>')
	    this.row('CIDR', this.data.cidr)
	    this.row('Mask', this.link(this.data.mask),
		     IPRenderer.Bits(this.data.mask))
	    this.row('Max hosts', cidr.Net.Maxhosts(this.data.cidr)
		     .toLocaleString('en-US'))

	    this.templ.push('</tbody></table>')
	    this.finish()
	}
    }

    class NetRenderer extends IPRenderer {
	constructor(data, node, url_params) {
	    super(data, node, url_params)
	    this.geo = new Geo(url_params)
	}

	static Bits_paint(net) {
	    let idx = 0
	    let dec = net.ip._arr()
	    return net.ip.to_a().map( (chunk, chunk_idx) => {
		return `<span title='${dec[chunk_idx]}'>` + chunk.map( bit => {
		    let kls = idx++ < net.cidr ?'cidr-calc--net':'cidr-calc--ip'
		    return `<span class="${kls}"><code>${bit}</code></span>`
		}).join('') + '</span>'
	    }).join('<code> </code>')
	}

	start() {
	    this.templ.push('<table><tbody>')
	    let net = this.data.net

	    this.row('CIDR', net.cidr)
	    this.row('Mask', this.link(net.mask), IPRenderer.Bits(net.mask))
	    this.row('Max hosts', net.maxhosts().toLocaleString('en-US'))

	    let desc = net.describe()
	    if (desc.type !== 'Regular') desc.type = `<b>${desc.type}</b>`
	    if (desc.link) desc.subtype += ', ' + this.link(desc.link)
	    this.row('Type', desc.type, desc.subtype)

	    this.row('Address', net.ip, NetRenderer.Bits_paint(net))

	    if (desc.type === 'Regular') {
		this.templ.push('<tr><td colspan=3>')
		this.templ.push(this.geo.template())
		this.templ.push('</td></tr>')
	    }

	    this.row('Network', net.netaddr(), IPRenderer.Bits(net.netaddr()))

	    this.row('Broadcast', net.broadcast() || 'n/a',
		     IPRenderer.Bits(net.broadcast()))

	    this.row('Host', net.hostaddr(), IPRenderer.Bits(net.hostaddr()))

	    let range = net.range()
	    this.row('Begin', range[0])
	    this.row('End', range[1])

	    this.templ.push('</tbody></table>')
	    this.finish()
	    this.geo.hook(net.ip.toString())
	}
    }

    class NetContainsRenderer extends NetRenderer {
	constructor(data, node, url_params) {
	    super(data, node, url_params)
	}

	start() {
	    let includes = this.data.net.includes(this.data.q)
	    if (!includes) {
		this.templ.push(`<p><b>No</b>, see ${this.link(this.data.net)}.</p>`)
		this.finish()
		return
	    }
	    super.start()
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

	let engine = {
	    cidr: IPRenderer,
	    net: NetRenderer,
	    vlsm: VlsmRenderer,
	    'net-contains': NetContainsRenderer
	}
	let klass = engine[r.type];
	(new klass(r, out, url_params)).start()

	// upd location after successful rendering only
	if (query !== url_params.get('q')) {
	    url_params.set('q', query)
	    window.history.pushState('omglol', 'cidr.rb',
				     Renderer.Url(url_params))
	}
    }

    document.addEventListener('DOMContentLoaded', () => {
	let params = new URLSearchParams(location.hash.slice(2))
	let input = document.getElementById('cidr-calc__input')
	if (!input) return

	input.addEventListener('keydown', (evt) => {
	    if (evt.keyCode === 13) calc(params)
	})
	document.getElementById('cidr-calc__submit')
	    .onclick = () => calc(params)

	if (params.get('q')) {
	    input.value = params.get('q')
	    calc(params)
	}
	window.addEventListener("hashchange", () => {
	    params = new URLSearchParams(location.hash.slice(2))
	    input.value = params.get('q')
	    calc(params)
	})
    })
}
