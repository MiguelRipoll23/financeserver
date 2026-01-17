export interface DomainOTelService {
  pushAllMetrics(): Promise<void>;
}
