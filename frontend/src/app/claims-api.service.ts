import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Claim,
  CreateClaimRequest,
  LookupsResponse,
  ManagerMetrics,
} from './claims.models';

@Injectable({ providedIn: 'root' })
export class ClaimsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5202/api';

  getLookups(): Observable<LookupsResponse> {
    return this.http.get<LookupsResponse>(`${this.baseUrl}/lookups`);
  }

  getClaims(): Observable<Claim[]> {
    return this.http.get<Claim[]>(`${this.baseUrl}/claims`);
  }

  createClaim(request: CreateClaimRequest): Observable<Claim> {
    return this.http.post<Claim>(`${this.baseUrl}/claims`, request);
  }

  assignClaim(claimId: number, staffId: number): Observable<Claim> {
    return this.http.patch<Claim>(`${this.baseUrl}/claims/${claimId}/assign`, {
      staffId,
    });
  }

  decideClaim(
    claimId: number,
    approved: boolean,
    decisionNotes: string,
  ): Observable<Claim> {
    return this.http.patch<Claim>(
      `${this.baseUrl}/claims/${claimId}/decision`,
      { approved, decisionNotes },
    );
  }

  getMetrics(): Observable<ManagerMetrics> {
    return this.http.get<ManagerMetrics>(`${this.baseUrl}/metrics`);
  }
}
