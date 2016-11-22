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

})
