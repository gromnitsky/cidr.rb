#!/opt/bin/mocha --ui=tdd

'use strict';

let assert = require('assert')
let cidr = require('./cidr')

suite('CIDR', function() {
    setup(function() {
	this.ip = cidr.str2ip('192.168.1.7')
	this.mask = cidr.str2ip('255.255.255.252')
    })

    test('str2ip', function() {
	assert.deepEqual(cidr.str2ip('192.168.1.7'),
			 [ [ 1, 1, 0, 0, 0, 0, 0, 0 ],
			   [ 1, 0, 1, 0, 1, 0, 0, 0 ],
			   [ 0, 0, 0, 0, 0, 0, 0, 1 ],
			   [ 0, 0, 0, 0, 0, 1, 1, 1 ] ] )
    })

    test('ip2str', function() {
	assert.equal(cidr.ip2str(
	    [ [ 1, 1, 0, 0, 0, 0, 0, 0 ],
	      [ 1, 0, 1, 0, 1, 0, 0, 0 ],
	      [ 0, 0, 0, 0, 0, 0, 0, 1 ],
	      [ 0, 0, 0, 0, 0, 1, 0, 0 ] ] ), '192.168.1.4')
    })

    test('netaddr', function() {
	let r = cidr.netaddr(this.ip, this.mask)
	assert.deepEqual(cidr.ip2str(r), '192.168.1.4')
    })

    test('ip_invert', function() {
	let chunks = [ [ 1, 1, 0, 0, 0, 0, 0, 0 ],
		       [ 1, 0, 1, 0, 1, 0, 0, 0 ],
		       [ 0, 0, 0, 0, 0, 0, 0, 1 ],
		       [ 0, 0, 0, 0, 0, 1, 0, 0 ] ]

	assert.deepEqual(cidr.ip_invert(cidr.ip_invert(chunks)), chunks)
    })

    test('broadcast_addr', function() {
	let r = cidr.broadcast_addr(this.ip, this.mask)
	assert.equal(cidr.ip2str(r), '192.168.1.7')
    })

    test('hostaddr', function() {
	let r = cidr.hostaddr(this.ip, this.mask)
	assert.equal(cidr.ip2str(r), '0.0.0.3')
    })

    test('mask', function() {
	assert.deepEqual(cidr.mask(30),
		     [ [ 1, 1, 1, 1, 1, 1, 1, 1 ],
		       [ 1, 1, 1, 1, 1, 1, 1, 1 ],
		       [ 1, 1, 1, 1, 1, 1, 1, 1 ],
		       [ 1, 1, 1, 1, 1, 1, 0, 0 ] ])
    })

    test('cidr', function() {
	assert.deepEqual(cidr.cidr([ [ 1, 1, 1, 1, 1, 1, 1, 1 ],
				     [ 1, 1, 1, 1, 1, 1, 1, 1 ],
				     [ 1, 1, 1, 1, 1, 1, 1, 1 ],
				     [ 1, 1, 1, 1, 1, 1, 0, 0 ] ]), 30)
    })

    test('maxhosts', function() {
	assert.equal(cidr.maxhosts(30), 2)
    })

    test('hosts_range', function() {
	assert.deepEqual(cidr.hosts_range(this.ip, this.mask),
			 [cidr.str2ip('192.168.1.5'),
			  cidr.str2ip('192.168.1.6')])

	assert.deepEqual(cidr.hosts_range(this.ip, cidr.mask(16)),
			 [cidr.str2ip('192.168.0.1'),
			  cidr.str2ip('192.168.255.254')])
    })

    test('query_parse', function() {
	assert.throws( () => {
	    cidr.query_parse('huh?')
	}, /incomplete query/)

	assert.deepEqual(cidr.query_parse('30'), {
	    cidr: 30,
	    mask: cidr.str2ip('255.255.255.252')
	})
	assert.deepEqual(cidr.query_parse('/8'), {
	    cidr: 8,
	    mask: cidr.str2ip('255.0.0.0')
	})

	assert.deepEqual(cidr.query_parse('255.255.0.0'), {
	    cidr: 16,
	    mask: cidr.str2ip('255.255.0.0')
	})

	assert.deepEqual(cidr.query_parse('127.0.0.1 255.255.0.0'), {
	    cidr: 16,
	    mask: cidr.str2ip('255.255.0.0'),
	    ip: cidr.str2ip('127.0.0.1')
	})

	assert.deepEqual(cidr.query_parse('127.0.0.1/8'), {
	    cidr: 8,
	    mask: cidr.str2ip('255.0.0.0'),
	    ip: cidr.str2ip('127.0.0.1')
	})
    })

})
