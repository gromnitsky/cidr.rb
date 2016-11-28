# cird.rb

Renders IPv4 CIDR blocks in console or browser. The latter is suitable
for printing & pinning it to the wall.

Includes a simple CIDR/VLSM calculator. Works offline (except for geo
ip info).

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

## Bugs

* Chrome 53+, Firefox 50+ only (No Edge or Safari support).

## License

MIT.
