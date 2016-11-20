def cidr host_bits
  32 - host_bits
end

def subnet_addr host_bits
  2**host_bits
end

def subnet_mask cidr
  '%3d.%3d.%3d.%3d' %
    1.upto(32).map {|bit| bit <= cidr ? 1 : 0 }
    .each_slice(8)
    .map {|val| val.join.to_i 2 }.to_a
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

    gist = 'https://gist.github.com/gromnitsky/29124d477a96aedb5a50f83539d9ce3e'
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
}
table {
  width: 100%;
  border-collapse: collapse;
}
table th {
  background-color: lightgoldenrodyellow;
  text-align: center !important;
}
table tr:nth-child(even) {
  background-color: #fafafa;
}
</style>
</head>

<body>

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
<a href="<%= gist %>"><%= gist %></a>
</p>

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
