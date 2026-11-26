using System.Text.Json;
using Confluent.Kafka;

namespace ClaimsApi.Services;

public class KafkaProducerService : IDisposable
{
    private readonly IProducer<Null, string> _producer;
    private readonly ILogger<KafkaProducerService> _logger;
    private readonly string _topic;

    public KafkaProducerService(IConfiguration configuration, ILogger<KafkaProducerService> logger)
    {
        _logger = logger;
        _topic = configuration["Kafka:Topic"] ?? "claim-events";
        var producerConfig = new ProducerConfig
        {
            BootstrapServers = configuration["Kafka:BootstrapServers"] ?? "localhost:9092",
            MessageTimeoutMs = 3000
        };
        _producer = new ProducerBuilder<Null, string>(producerConfig).Build();
    }

    public async Task PublishAsync(ClaimEvent claimEvent, CancellationToken cancellationToken = default)
    {
        try
        {
            await _producer.ProduceAsync(
                _topic,
                new Message<Null, string> { Value = JsonSerializer.Serialize(claimEvent) },
                cancellationToken);
        }
        catch (ProduceException<Null, string> exception)
        {
            _logger.LogWarning(exception, "Could not publish claim event {EventType} for claim {ClaimId}", claimEvent.EventType, claimEvent.ClaimId);
        }
        catch (KafkaException exception)
        {
            _logger.LogWarning(exception, "Kafka is unavailable; claim event {EventType} for claim {ClaimId} was not published", claimEvent.EventType, claimEvent.ClaimId);
        }
    }

    public void Dispose() => _producer.Dispose();
}
