export type UserRole = 'Claimant' | 'Claims Staff' | 'Manager';

export type ClaimStatus = 'Submitted' | 'Assigned' | 'Approved' | 'Rejected';

export interface Claimant {
  id: number;
  fullName: string;
  policyNumber: string;
  email: string;
}

export interface ClaimsStaff {
  id: number;
  fullName: string;
  specialization: string;
}

export interface Claim {
  id: number;
  claimantId: number;
  assignedStaffId: number | null;
  claimType: string;
  description: string;
  claimAmount: number;
  status: ClaimStatus;
  decisionNotes: string | null;
  createdAt: string;
  claimant: Claimant;
  assignedStaff: ClaimsStaff | null;
}

export interface ManagerMetrics {
  id: number;
  pendingExposureAmount: number;
  approvedLiabilityAmount: number;
  openClaimsCount: number;
  totalClaimsCount: number;
  lastUpdatedAt: string;
}

export interface LookupsResponse {
  claimants: Claimant[];
  staff: ClaimsStaff[];
}

export interface CreateClaimRequest {
  claimantId: number;
  claimType: string;
  description: string;
  claimAmount: number;
}
