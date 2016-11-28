def cidr host_bits
  32 - host_bits
end

def subnet_mask cidr
  '%3d.%3d.%3d.%3d' %
    1.upto(32).map {|bit| bit <= cidr ? 1 : 0 }
    .each_slice(8)
    .map {|val| val.join.to_i 2 }.to_a
end

def subnet_addr host_bits
  2**host_bits
end

rows = 0.upto(24).map do |idx|
  ["/#{cidr idx}", idx, subnet_mask(cidr idx), subnet_addr(idx)]
end

# magic comment

if $0 == __FILE__
  tbl_headers = ['CIDR', 'Host bits', 'Subnet mask', 'Addresses in subnet']

  if ARGV[0] == 'html'
    require 'erb'

    src = []
    fd = File.new $0
    while line = fd.gets
      break if line == "# magic comment\n"
      src << line
    end

    github = 'https://github.com/gromnitsky/cidr.rb'
    template = <<END
<!doctype html>
<html>
<head>
<title><%= $0 %></title>
<meta charset="utf-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style type="text/css">
@media (min-width: 601px) {
  body {
    width: 600px;
    margin: 0 auto;
  }
}
@media print
{
  th, td {
    border-bottom: 1px solid #ddd;
  }
  #cidr-calc { display: none; }
}
a { text-decoration: none; }
a:hover { text-decoration: underline; }
table {
  width: 100%;
  border-collapse: collapse;
}
table th {
  background-color: lightgoldenrodyellow;
  border-left: 1px solid white;
  border-bottom: 1px solid white;
}
table tr:nth-child(even) {
  background-color: #fafafa;
}
#cidr-calc__form {
  display: flex;
  margin: 0.5em 0;
}
#cidr-calc__input {
  flex-grow: 1;
  margin-right: .2em;
}
#cidr-calc__result { margin-bottom: 1em; }
details details { margin-top: .5em; }
details details ul { margin-top: .5em; }
#cidr-calc__geo { margin-bottom: .5em; }
.cidr-calc--net {
  background-color: #005bbb;
  color: #ffd500;
}
.cidr-calc--ip {
  background-color: #ffd500;
  color: #005bbb;
}
.cidr-calc--range {
  white-space: pre;
  font-family: monospace;
}
</style>
</head>

<body>

<div id="cidr-calc">
 <details>
  <summary>Help</summary>
<table>
<thead>
<tr><th>Query</th><th>Explanation</th></tr>
</thead>
<tbody>
<tr><td><code>24</code></td> <td>CIDR</td></tr>
<tr><td><code>255.255.255.192</code></td> <td>Mask</td></tr>
<tr><td><code>192.168.1.1 255.255.0.0</code></td> <td>IP & mask</td></tr>
<tr><td><code>192.168.1.1/30</code></td> <td>IP & CIDR</td></tr>
<tr><td><code>128.42.5.17 ~ 128.42.5.18</code></td> <td>Find the max mask for 2 IPs</td></tr>
<tr><td><code>192.168.1.0/26 1,7,29,2,6</code></td> <td>VLSM (divide a network into subnets)</td></tr>
</tbody>
</table>
  <details>
   <summary>Special-purpose IP attributes</summary>
<ul>
<li>S - (source) an address is valid when used as the
source address of an IP datagram that transits 2 devices.</li>
<li>D - (destination) an address is valid when used as the destination
address of an IP datagram that transits 2 devices.</li>
<li>F - (forwardable) a router may
forward an IP datagram whose destination address is drawn from this
allocated block between external interfaces.</li>
<li>G - (global) an IP datagram whose destination address is drawn from this
address block is forwardable beyond a specified administrative
domain.</li>
</ul>
  </details>
 </details>

 <div id="cidr-calc__form">
  <input id="cidr-calc__input" type="search" spellcheck="false" placeholder="Type, for example, 192.168.1.1/29">
  <button id="cidr-calc__submit">Calc</button>
 </div>

 <div id="cidr-calc__result">
  <noscript><mark>The calculator requires JavaScript.</mark></noscript>
 </div>
</div>

<table>

<thead>
<tr>
<% (tbl_headers + ['', '']).each do |val| %>
<th><%= val %></th>
<% end %>
</tr>
</thead>

<tbody>
<% rows.each do |val| %>
<tr>
<td><%= val[0] %></td>
<td><%= val[1] %></td>
<td style="text-align: center;"><code><%= val[2].gsub(' ', '&nbsp;') %></code></td>

<td style="text-align: right;"><%= val[3] %></td>
<td style="text-align: center;">=</td>
<td style="text-align: left;">2<sup><%= val[1] %></sup></td>
</tr>
<% end %>
</tbody>

</table>

<pre><%= CGI.escape_html src.join '' %></pre>

<p>
<a href="<%= github %>"><%= github %></a>
</p>

<script src="cidr.js"></script>

</body>
</html>
END
    puts (ERB.new template).result binding

  else
    tbl_row_spec = "%-6s %-12s %-14s %22s"
    puts tbl_row_spec % tbl_headers

    rows.each do |val|
      val[3] = '%d = %-4s' %  [val[3], "2^#{val[1]}"]
      puts tbl_row_spec % val
    end
  end
end
