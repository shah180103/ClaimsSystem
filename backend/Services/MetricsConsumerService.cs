using ClaimsApi.Data;
using Confluent.Kafka;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace ClaimsApi.Services;

public class MetricsConsumerService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MetricsConsumerService> _logger;

    public MetricsConsumerService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<MetricsConsumerService> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Run(() => ConsumeLoop(stoppingToken), stoppingToken);
    }

    private void ConsumeLoop(CancellationToken stoppingToken)
    {
        var consumerConfig = new ConsumerConfig
        {
            BootstrapServers = _configuration["Kafka:BootstrapServers"] ?? "localhost:9092",
            GroupId = _configuration["Kafka:ConsumerGroup"] ?? "claims-metrics",
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false
        };

        using var consumer = new ConsumerBuilder<Ignore, string>(consumerConfig).Build();
        consumer.Subscribe(_configuration["Kafka:Topic"] ?? "claim-events");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var result = consumer.Consume(stoppingToken);
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<ClaimsDbContext>();
                MetricsCalculator.RecalculateAsync(dbContext, stoppingToken).GetAwaiter().GetResult();
                consumer.Commit(result);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (KafkaException exception)
            {
                _logger.LogWarning(exception, "Kafka metrics consumer encountered an error");
                DelayBeforeRetry(stoppingToken);
            }
            catch (DbUpdateException exception)
            {
                _logger.LogError(exception, "Could not persist recalculated claim metrics");
            }
            catch (SqliteException exception)
            {
                _logger.LogError(exception, "Could not read or update claim metrics in SQLite");
            }
        }
    }

    private static void DelayBeforeRetry(CancellationToken stoppingToken)
    {
        try
        {
            Task.Delay(TimeSpan.FromSeconds(1), stoppingToken).GetAwaiter().GetResult();
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
    }
}
