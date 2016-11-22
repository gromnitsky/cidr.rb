#!/opt/bin/mocha --ui=tdd

'use strict';

let assert = require('assert')
let cidr = require('./cidr')

suite('CIDR', function() {
    setup(function() {
    })

    test('ip_to_fcb', function() {
	assert.deepEqual(cidr.ip_to_fcb('192.168.1.7'),
			 [ [ 1, 1, 0, 0, 0, 0, 0, 0 ],
			   [ 1, 0, 1, 0, 1, 0, 0, 0 ],
			   [ 0, 0, 0, 0, 0, 0, 0, 1 ],
			   [ 0, 0, 0, 0, 0, 1, 1, 1 ] ] )
    })

    test('fcb_to_ip', function() {
	assert.equal(cidr.fcb_to_ip(
	    [ [ 1, 1, 0, 0, 0, 0, 0, 0 ],
	      [ 1, 0, 1, 0, 1, 0, 0, 0 ],
	      [ 0, 0, 0, 0, 0, 0, 0, 1 ],
	      [ 0, 0, 0, 0, 0, 1, 0, 0 ] ] ), '192.168.1.4')
    })

    test('netaddr', function() {
	assert.deepEqual(cidr.netaddr('192.168.1.7', '255.255.255.252'),
			 '192.168.1.4')
    })

    test('fcb_invert', function() {
	let chunks = [ [ 1, 1, 0, 0, 0, 0, 0, 0 ],
		       [ 1, 0, 1, 0, 1, 0, 0, 0 ],
		       [ 0, 0, 0, 0, 0, 0, 0, 1 ],
		       [ 0, 0, 0, 0, 0, 1, 0, 0 ] ]

	assert.deepEqual(cidr.fcb_invert(cidr.fcb_invert(chunks)), chunks)
    })

    test('broadcast_addr', function() {
	assert.equal(cidr.broadcast_addr('192.168.1.7', '255.255.255.252'),
		     '192.168.1.7')
    })

    test('hostaddr', function() {
	assert.equal(cidr.hostaddr('192.168.1.7', '255.255.255.252'),
		     '0.0.0.3')
    })

    test('mask_fcb', function() {
	assert.deepEqual(cidr.mask_fcb(30),
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
	assert.deepEqual(cidr.hosts_range('192.168.1.7', 30),
			 ['192.168.1.7', '192.168.1.8'])
    })

    test('parse_query', function() {
	assert.throws( () => {
	    cidr.parse_query('huh?')
	}, /incomplete query/)

	assert.deepEqual(cidr.parse_query('30'), { cidr: 30 } )
	assert.deepEqual(cidr.parse_query('/8'), { cidr: 8 } )

	assert.deepEqual(cidr.parse_query('255.255.0.0'), { mask: '255.255.0.0' } )

	assert.deepEqual(cidr.parse_query('127.0.0.1 255.255.0.0'), {
	    mask: '255.255.0.0',
	    ip: '127.0.0.1'
	})

	assert.deepEqual(cidr.parse_query('127.0.0.1/8'), {
	    cidr: '8',
	    ip: '127.0.0.1'
	})
    })

})
