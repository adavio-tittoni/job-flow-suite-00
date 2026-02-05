// Exemplo de conexão ao Redis Cloud (Certfai) com TLS - StackExchange.Redis
// Redis Cloud exige SSL; sem Ssl = true a conexão falha.

using StackExchange.Redis;

public class ConnectRedisCloudExample
{
    public void Run()
    {
        var options = new ConfigurationOptions
        {
            EndPoints = { { "redis-17499.c114.us-east-1-4.ec2.cloud.redislabs.com", 17499 } },
            User = "default",
            Password = "SUA_SENHA_AQUI",
            Ssl = true,
            AbortOnConnectFail = false
        };

        // Opcional: se der erro de certificado (ex.: "remote certificate is invalid"),
        // use isso para aceitar o certificado do Redis Cloud em dev (não use em produção sem revisar):
        // options.CertificateValidation += (_, _, _, _) => true;

        var muxer = ConnectionMultiplexer.Connect(options);
        var db = muxer.GetDatabase();

        db.StringSet("foo", "bar");
        var result = db.StringGet("foo");
        Console.WriteLine(result); // >>> bar
    }
}
