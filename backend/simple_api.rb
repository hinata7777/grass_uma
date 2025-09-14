require 'socket'
require 'json'

port = 3000
server = TCPServer.new('0.0.0.0', port)
puts "Simple API server starting on port #{port}..."

loop do
  client = server.accept
  request = client.gets

  response_body = { message: "Rails API is running!" }.to_json

  response = "HTTP/1.1 200 OK\r\n" +
             "Content-Type: application/json\r\n" +
             "Access-Control-Allow-Origin: *\r\n" +
             "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n" +
             "Access-Control-Allow-Headers: Content-Type\r\n" +
             "Content-Length: #{response_body.length}\r\n" +
             "\r\n" +
             response_body

  client.print response
  client.close
end