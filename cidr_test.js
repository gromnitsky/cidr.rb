#!/opt/bin/mocha --ui=tdd

'use strict';

let assert = require('assert')
let cidr = require('./cidr')

suite('IPv4', function() {
    setup(function() {
    })

    test('constructor', function() {
	assert.throws( () => {
	    new cidr.IPv4(-1)
	}, /invalid number/)

	assert.equal(new cidr.IPv4('192.0.0.255').addr, 3221225727)
    })

    test('coercion', function() {
	assert.equal(new cidr.IPv4('192.0.0.255') > new cidr.IPv4('192.0.0.254'), true)
	assert.equal(new cidr.IPv4('192.0.0.255') + 1, 3221225728)
    })

    test('eq', function() {
	let ip = new cidr.IPv4('192.0.0.255')
	assert.equal(ip.eq('192.0.0.255'), true)
	assert.equal(ip.eq('192.0.0.254'), false)
	assert.equal(ip.eq(null), false)
    })

    test('toString', function() {
	assert.equal((new cidr.IPv4('192.0.0.255')).toString(), '192.0.0.255')
    })

    test('to_arr', function() {
	assert.deepEqual( (new cidr.IPv4('192.168.1.4')).to_a(),
			  [ [ 1, 1, 0, 0, 0, 0, 0, 0 ],
			    [ 1, 0, 1, 0, 1, 0, 0, 0 ],
			    [ 0, 0, 0, 0, 0, 0, 0, 1 ],
			    [ 0, 0, 0, 0, 0, 1, 0, 0 ] ] )
    })

    test('reverse', function() {
	assert.equal( (new cidr.IPv4('192.168.1.4')).reverse(),
		      '4.1.168.192.in-addr.arpa')
    })

})

suite('Net', function() {
    setup(function() {
    })

    test('constructor', function() {
	assert.equal(new cidr.Net('192.0.0.1', 18).mask.toString(), '255.255.192.0')
	assert.equal(new cidr.Net(new cidr.IPv4('192.0.0.1'), new cidr.IPv4('255.255.192.0')).cidr, 18)

	assert.throws( () => {
	    new cidr.Net('192.0.0.1', new cidr.IPv4('255.255.192.1'))
	}, /invalid mask/)
    })

    test('net/host/brd', function() {
	let net1 = new cidr.Net('1.2.3.4', 0)
	assert.deepEqual(net1.netaddr(), new cidr.IPv4('0.0.0.0'))
	assert.deepEqual(net1.hostaddr(), new cidr.IPv4('1.2.3.4'))
	assert.deepEqual(net1.broadcast(), new cidr.IPv4('255.255.255.255'))

	let net2 = new cidr.Net('1.2.3.4', 28)
	assert.deepEqual(net2.netaddr(), new cidr.IPv4('1.2.3.0'))
	assert.deepEqual(net2.hostaddr(), new cidr.IPv4('0.0.0.4'))
	assert.deepEqual(net2.broadcast(), new cidr.IPv4('1.2.3.15'))

	let net3 = new cidr.Net('1.2.3.4', 31)
	assert.deepEqual(net3.netaddr(), new cidr.IPv4('1.2.3.4'))
	assert.deepEqual(net3.hostaddr(), new cidr.IPv4('0.0.0.0'))
	assert.deepEqual(net3.broadcast(), null)

	let net4 = new cidr.Net('1.2.3.4', 32)
	assert.deepEqual(net4.netaddr(), new cidr.IPv4('1.2.3.4'))
	assert.deepEqual(net4.hostaddr(), new cidr.IPv4('0.0.0.0'))
	assert.deepEqual(net4.broadcast(), null)

	let net5 = new cidr.Net('192.168.1.1', 26)
	assert.deepEqual(net5.netaddr(), new cidr.IPv4('192.168.1.0'))
    })

    test('maxhosts', function() {
	let net = new cidr.Net('1.2.3.4', 28)
	assert.equal(net.maxhosts(), 14)
    })

    test('range', function() {
	let net = new cidr.Net('1.2.3.255', 30)
	assert.deepEqual(net.range(), [new cidr.IPv4('1.2.3.253'),
				       new cidr.IPv4('1.2.3.254')])

	net = new cidr.Net('1.2.3.255', 31)
	assert.deepEqual(net.range(), [new cidr.IPv4('1.2.3.254'),
				       new cidr.IPv4('1.2.3.255')])

	net = new cidr.Net('1.2.3.255', 0)
	assert.deepEqual(net.range(), [new cidr.IPv4('0.0.0.1'),
				       new cidr.IPv4('255.255.255.254')])
    })

    test('Net.Cidr_max', function() {
	let n = cidr.Net.Cidr_max(new cidr.IPv4('128.42.5.17'),
				  new cidr.IPv4('128.42.5.18'))
	assert.equal(n, 30)

	n = cidr.Net.Cidr_max(new cidr.IPv4('1.42.5.17'),
			      new cidr.IPv4('128.42.5.18'))
	assert.equal(n, 0)
    })

    test('describe', function() {
	let d = new cidr.Net('127.0.0.124', 24)
	assert.deepEqual(d.describe(), { type: 'Special-purpose',
					 subtype: 'Loopback',
					 link: '127.0.0.0/8' } )

	d = new cidr.Net('127.0.0.124', 7)
	assert.deepEqual(d.describe(), { type: 'Regular',
					 subtype: "" })

	d = new cidr.Net('126.0.0.0', 7)
	assert.deepEqual(d.describe(), { type: 'Regular',
					 subtype: "network" })

	d = new cidr.Net('127.255.255.255', 7)
	assert.deepEqual(d.describe(), { type: 'Regular',
					 subtype: "broadcast" })
    })

    test('vlsm', function() {
	assert.throws( () => {
	    let net = new cidr.Net('192.168.1.1', 26)
	    net.vlsm([2, 20])
	}, /invalid network address/)

	let net = new cidr.Net('192.168.1.0', 26)
	assert.throws( () => {
	    net.vlsm([])
	}, /invalid subnet spec/)

	assert.throws( () => {
	    net.vlsm([-1, 0])
	}, /invalid subnet spec/)

	net = new cidr.Net(new cidr.IPv4('192.168.1.0'), 26)
	assert.deepEqual(net.vlsm([1,7,29,2,6]), {
	    error: null,
	    tbl:
	    [{nhosts: 29, net: new cidr.Net('192.168.1.0', 27) },
	     {nhosts: 7, net: new cidr.Net('192.168.1.32', 28) },
	     {nhosts: 6, net: new cidr.Net('192.168.1.48', 29) },
	     {nhosts: 2, net: new cidr.Net('192.168.1.56', 30) },
	     {nhosts: 1, net: new cidr.Net('192.168.1.60', 30) }]
	})

	net = new cidr.Net(new cidr.IPv4('192.168.1.0'), 26)
	assert.deepEqual(net.vlsm([1,7,29,2,7]), {
	    error: "some of subnets didn't fit in: 2,1",
	    tbl:
	    [{nhosts: 29, net: new cidr.Net('192.168.1.0', 27) },
	     {nhosts: 7, net: new cidr.Net('192.168.1.32', 28) },
	     {nhosts: 7, net: new cidr.Net('192.168.1.48', 28) }],
	})

	assert.deepEqual(net.vlsm([70]), {
	    error: "some of subnets didn't fit in: 70",
	    tbl: []
	})
    })

    test('query_parse', function() {
	assert.throws( () => {
	    cidr.query_parse('huh?')
	}, /invalid query/)

	assert.deepEqual(cidr.query_parse('30'), {
	    type: 'cidr',
	    cidr: 30,
	    mask: new cidr.IPv4('255.255.255.252')
	})
	assert.deepEqual(cidr.query_parse('/8'), {
	    type: 'cidr',
	    cidr: 8,
	    mask: new cidr.IPv4('255.0.0.0')
	})

	assert.deepEqual(cidr.query_parse('255.255.0.0'), {
	    type: 'cidr',
	    cidr: 16,
	    mask: new cidr.IPv4('255.255.0.0')
	})

	assert.deepEqual(cidr.query_parse('127.0.0.1 255.255.0.0'), {
	    type: 'net',
	    net: new cidr.Net('127.0.0.1',
			      cidr.Net.Cidr(new cidr.IPv4('255.255.0.0')))
	})

	assert.deepEqual(cidr.query_parse('127.0.0.1/8'), {
	    type: 'net',
	    net: new cidr.Net('127.0.0.1', 8)
	})

	assert.deepEqual(cidr.query_parse('127.0.0.1/8 20,10,1,0,3'), {
	    type: 'vlsm',
	    hosts: [20,10,1,0,3],
	    net: new cidr.Net('127.0.0.1', 8)
	})

	assert.deepEqual(cidr.query_parse('255.255.255.255/32'), {
	    type: 'net',
	    net: new cidr.Net('255.255.255.255', 32)
	})

	assert.deepEqual(cidr.query_parse('128.42.5.17 ~ 128.42.5.18'), {
	    type: 'net',
	    net: new cidr.Net('128.42.5.17', 30)
	})
    })

})
