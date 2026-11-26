import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, Observable, catchError, exhaustMap, finalize, interval, tap } from 'rxjs';
import { ClaimsApiService } from './claims-api.service';
import {
  Claim,
  ClaimStatus,
  ClaimsStaff,
  Claimant,
  CreateClaimRequest,
  LookupsResponse,
  ManagerMetrics,
  UserRole,
} from './claims.models';

interface ClaimStatusNotification {
  id: number;
  claimId: number;
  claimantId: number;
  status: 'Approved' | 'Rejected';
  decisionNotes: string | null;
}

type StaffQueueFilter = 'Actionable' | 'Available' | 'My Queue' | 'All';

@Component({
  imports: [CurrencyPipe, DatePipe, DecimalPipe, FormsModule],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly api = inject(ClaimsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly roles: UserRole[] = ['Claimant', 'Claims Staff', 'Manager'];
  readonly staffQueueFilters: StaffQueueFilter[] = [
    'Actionable',
    'Available',
    'My Queue',
    'All',
  ];
  readonly claimTypes = ['Auto', 'Property', 'Health', 'Other'];
  readonly today = new Date();
  readonly role = signal<UserRole>('Claimant');
  readonly claimants = signal<Claimant[]>([]);
  readonly staff = signal<ClaimsStaff[]>([]);
  readonly claims = signal<Claim[]>([]);
  readonly claimStatusNotifications = signal<ClaimStatusNotification[]>([]);
  readonly metrics = signal<ManagerMetrics | null>(null);
  readonly selectedClaimantId = signal<number | null>(null);
  readonly selectedStaffId = signal<number | null>(null);
  readonly staffQueueFilter = signal<StaffQueueFilter>('Actionable');
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly claimsLoading = signal(true);
  readonly lookupsLoading = signal(true);
  readonly metricsRefreshing = signal(false);
  readonly submitting = signal(false);
  readonly processingClaimId = signal<number | null>(null);
  readonly decisionNotes: Record<number, string> = {};
  readonly assignedToMeCount = computed(() => {
    const staffId = this.selectedStaffId();
    return staffId === null
      ? 0
      : this.claims().filter(
          (claim) =>
            claim.status === 'Assigned' && claim.assignedStaffId === staffId,
        ).length;
  });
  readonly claimantClaims = computed(() => {
    const claimantId = this.selectedClaimantId();
    return claimantId === null
      ? []
      : this.claims().filter(
          (claim) => Number(claim.claimantId) === Number(claimantId),
        );
  });
  readonly staffClaims = computed(() => {
    const staffId = this.selectedStaffId();
    const filter = this.staffQueueFilter();

    return this.claims().filter((claim) => {
      const assignedToMe =
        staffId !== null &&
        claim.assignedStaffId !== null &&
        Number(claim.assignedStaffId) === Number(staffId);
      const inMyQueue = claim.status === 'Assigned' && assignedToMe;

      switch (filter) {
        case 'Actionable':
          return claim.status === 'Submitted' || assignedToMe;
        case 'Available':
          return claim.status === 'Submitted';
        case 'My Queue':
          return inMyQueue;
        case 'All':
          return true;
      }
    });
  });
  readonly visibleClaimNotifications = computed(() => {
    const claimantId = this.selectedClaimantId();
    return claimantId === null
      ? []
      : this.claimStatusNotifications().filter(
          (notification) =>
            Number(notification.claimantId) === Number(claimantId),
        );
  });

  private readonly previousClaimStatuses = new Map<number, ClaimStatus>();
  private nextNotificationId = 1;
  draft: CreateClaimRequest = {
    claimantId: 0,
    claimType: '',
    description: '',
    claimAmount: 0,
  };

  ngOnInit(): void {
    this.loadLookups();
    this.refreshClaims();

    interval(5000)
      .pipe(
        exhaustMap(() => this.fetchClaims()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    interval(5000)
      .pipe(
        exhaustMap(() => (this.role() === 'Manager' ? this.fetchMetrics() : EMPTY)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  setRole(role: UserRole): void {
    this.role.set(role);
    this.clearMessages();
    if (role === 'Manager') {
      this.refreshMetrics();
    }
  }

  refreshClaims(): void {
    this.claimsLoading.set(true);
    this.fetchClaims()
      .pipe(finalize(() => this.claimsLoading.set(false)))
      .subscribe();
  }

  refreshMetrics(): void {
    this.metricsRefreshing.set(true);
    this.fetchMetrics()
      .pipe(finalize(() => this.metricsRefreshing.set(false)))
      .subscribe();
  }

  submitClaim(): void {
    const claimantId = this.selectedClaimantId();
    const amount = Number(this.draft.claimAmount);
    if (
      claimantId === null ||
      !this.draft.claimType ||
      !this.draft.description.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return;
    }

    this.clearMessages();
    this.submitting.set(true);
    this.api
      .createClaim({
        claimantId,
        claimType: this.draft.claimType,
        description: this.draft.description.trim(),
        claimAmount: amount,
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (claim) => {
          this.successMessage.set(`Claim #${claim.id} was submitted.`);
          this.draft = {
            claimantId,
            claimType: '',
            description: '',
            claimAmount: 0,
          };
          this.refreshClaims();
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  assignToMe(claim: Claim): void {
    const staffId = this.selectedStaffId();
    if (staffId === null || claim.status !== 'Submitted') {
      return;
    }

    this.clearMessages();
    this.processingClaimId.set(claim.id);
    this.api
      .assignClaim(claim.id, staffId)
      .pipe(finalize(() => this.processingClaimId.set(null)))
      .subscribe({
        next: () => {
          this.successMessage.set(`Claim #${claim.id} was assigned to you.`);
          this.refreshClaims();
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  decide(claim: Claim, approved: boolean): void {
    const decisionNotes = this.decisionNotes[claim.id]?.trim() ?? '';
    if (
      claim.status !== 'Assigned' ||
      claim.assignedStaffId !== this.selectedStaffId() ||
      !decisionNotes
    ) {
      return;
    }

    this.clearMessages();
    this.processingClaimId.set(claim.id);
    this.api
      .decideClaim(claim.id, approved, decisionNotes)
      .pipe(finalize(() => this.processingClaimId.set(null)))
      .subscribe({
        next: () => {
          this.successMessage.set(
            `Claim #${claim.id} was ${approved ? 'approved' : 'rejected'}.`,
          );
          delete this.decisionNotes[claim.id];
          this.refreshClaims();
        },
        error: (error: unknown) => this.showError(error),
      });
  }

  isDecisionDisabled(claim: Claim): boolean {
    return (
      this.processingClaimId() === claim.id ||
      !this.decisionNotes[claim.id]?.trim()
    );
  }

  isRecommendedMatch(claim: Pick<Claim, 'claimType'>): boolean {
    const selectedStaff = this.staff().find(
      (officer) => officer.id === this.selectedStaffId(),
    );

    return (
      selectedStaff?.specialization.trim().toLowerCase() ===
      claim.claimType.trim().toLowerCase()
    );
  }

  dismissClaimNotification(notificationId: number): void {
    this.claimStatusNotifications.update((notifications) =>
      notifications.filter((notification) => notification.id !== notificationId),
    );
  }

  private loadLookups(): void {
    this.api.getLookups().pipe(
      finalize(() => this.lookupsLoading.set(false)),
    ).subscribe({
      next: (lookups: LookupsResponse) => {
        this.claimants.set(lookups.claimants);
        this.staff.set(lookups.staff);
        const firstClaimant = lookups.claimants[0];
        const firstStaff = lookups.staff[0];
        this.selectedClaimantId.set(firstClaimant?.id ?? null);
        this.selectedStaffId.set(firstStaff?.id ?? null);
        this.draft.claimantId = firstClaimant?.id ?? 0;
      },
      error: (error: unknown) => this.showError(error),
    });
  }

  private fetchClaims(): Observable<Claim[]> {
    return this.api.getClaims().pipe(
      tap((claims) => this.updateClaimsAndNotifications(claims)),
      catchError((error: unknown) => {
        this.showError(error);
        return EMPTY;
      }),
    );
  }

  private updateClaimsAndNotifications(claims: Claim[]): void {
    const selectedClaimantId = this.selectedClaimantId();
    const newNotifications: ClaimStatusNotification[] = [];

    for (const claim of claims) {
      const previousStatus = this.previousClaimStatuses.get(claim.id);
      if (
        previousStatus !== undefined &&
        previousStatus !== claim.status &&
        (claim.status === 'Approved' || claim.status === 'Rejected') &&
        selectedClaimantId !== null &&
        Number(claim.claimantId) === Number(selectedClaimantId)
      ) {
        newNotifications.push({
          id: this.nextNotificationId++,
          claimId: claim.id,
          claimantId: claim.claimantId,
          status: claim.status,
          decisionNotes: claim.decisionNotes,
        });
      }

      this.previousClaimStatuses.set(claim.id, claim.status);
    }

    if (newNotifications.length > 0) {
      this.claimStatusNotifications.update((notifications) => [
        ...newNotifications,
        ...notifications,
      ]);
    }

    this.claims.set(claims);
  }

  private fetchMetrics(): Observable<ManagerMetrics> {
    return this.api.getMetrics().pipe(
      tap((metrics) => this.metrics.set(metrics)),
      catchError((error: unknown) => {
        this.showError(error);
        return EMPTY;
      }),
    );
  }

  private showError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      const message =
        typeof error.error?.message === 'string'
          ? error.error.message
          : typeof error.error?.title === 'string'
            ? error.error.title
            : `The request failed (${error.status || 'network error'}).`;
      this.errorMessage.set(message);
      this.successMessage.set('');
      return;
    }

    this.errorMessage.set('Something went wrong. Please try again.');
    this.successMessage.set('');
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
