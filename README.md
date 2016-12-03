# cird.rb

Renders IPv4 CIDR blocks in console or browser. The latter is suitable
for printing & pinning it to the wall.

Includes a simple CIDR/VLSM calculator. Works offline (except for geo
ip lookups).

Example: http://sigwait.tk/cidr/#/?q=128.42.5.17+%7E+128.42.5.18

## Usage

~~~
$ ruby cidr.rb
~~~
or

~~~
$ ruby cidr.rb html > index.html
$ xdg-open !$
~~~

## Library

	$ npm i cidr.rb

Address manipulations:

~~~
> cidr = require('cidr.rb')
>
> new cidr.IPv4(256)
#<IPv4: 0.0.1.0>
> new cidr.IPv4('1.2.3.4')
#<IPv4: 1.2.3.4>
> a = new cidr.IPv4('1.2.3.4') + 1
16909061
> new cidr.IPv4(a + 10)
#<IPv4: 1.2.3.15>
> new cidr.IPv4('1.2.3.4') < new cidr.IPv4('1.2.3.5')
true
> new cidr.IPv4('1.2.3.4').eq(new cidr.IPv4('1.2.3.4'))
true
> new cidr.IPv4('1.2.3.4').eq('1.2.3.4')
true
> new cidr.IPv4('1.2.3.4').reverse()
'4.3.2.1.in-addr.arpa'
> new cidr.IPv4('1.2.3.4').to_a()
[ [ 0, 0, 0, 0, 0, 0, 0, 1 ],
  [ 0, 0, 0, 0, 0, 0, 1, 0 ],
  [ 0, 0, 0, 0, 0, 0, 1, 1 ],
  [ 0, 0, 0, 0, 0, 1, 0, 0 ] ]
~~~

Network:

~~~
> new cidr.Net('1.2.3.4/16')
#<Net: 1.2.3.4/16>
> new cidr.Net('1.2.3.4', 16)
#<Net: 1.2.3.4/16>
> new cidr.Net(new cidr.IPv4('1.2.3.4'), new cidr.IPv4('255.255.0.0'))
#<Net: 1.2.3.4/16>
> a = new cidr.Net('1.2.3.4/16')
#<Net: 1.2.3.4/16>
> a.eq('1.2.3.4/16')
true
> a.eq(new cidr.Net('1.2.3.4/16'))
true
> a.netaddr()
#<IPv4: 1.2.0.0>
> a.hostaddr()
#<IPv4: 0.0.3.4>
> a.broadcast()
#<IPv4: 1.2.255.255>
> a.range()
[ #<IPv4: 1.2.0.1>, #<IPv4: 1.2.255.254> ]
> Array.from(new cidr.Net('1.2.3.4/29').to_iter())
[ #<IPv4: 1.2.3.1>,
  #<IPv4: 1.2.3.2>,
  #<IPv4: 1.2.3.3>,
  #<IPv4: 1.2.3.4>,
  #<IPv4: 1.2.3.5>,
  #<IPv4: 1.2.3.6> ]
> new cidr.Net('192.168.1.1/24').describe()
{ type: 'Special-purpose',
  subtype: 'Private-Use, attrs=SDF',
  link: '192.168.0.0/16' }
> new cidr.Net('192.168.1.1/24').maxhosts()
254
> new cidr.Net('192.168.1.1/28').includes('192.168.1.10')
true
> new cidr.Net('192.168.1.1/28').includes('192.168.1.40')
false
> cidr.Net.Cidr_max(new cidr.IPv4('128.42.5.17'), new cidr.IPv4('128.42.5.18'))
30
> new cidr.Net('192.168.1.0/26').vlsm([1,7,29,2,6])
{ error: null,
  tbl:
   [ { nhosts: 29, net: #<Net: 192.168.1.0/27> },
     { nhosts: 7, net: #<Net: 192.168.1.32/28> },
     { nhosts: 6, net: #<Net: 192.168.1.48/29> },
     { nhosts: 2, net: #<Net: 192.168.1.56/30> },
     { nhosts: 1, net: #<Net: 192.168.1.60/30> } ] }
> new cidr.Net('192.0.2.1/32') < new cidr.Net('192.0.2.2/32')
true
~~~

## Bugs

* Chrome 53+, Firefox 50+ only (No Edge or Safari support).
* IPv4 only. I don't like all this 'new' IPv6 staff. I hope IPv6 fad
  will end someday! hehe

## License

MIT.
