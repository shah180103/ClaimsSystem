import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { Claim } from './claims.models';

function makeClaim(
  id: number,
  status: Claim['status'],
  assignedStaffId: number | null,
): Claim {
  return {
    id,
    claimantId: 2,
    assignedStaffId,
    claimType: 'Property',
    description: 'Test claim',
    claimAmount: 500,
    status,
    decisionNotes: null,
    createdAt: '2026-11-25T12:00:00Z',
    claimant: {
      id: 2,
      fullName: 'Jordan Taylor',
      policyNumber: 'POL-1002',
      email: 'jordan@example.com',
    },
    assignedStaff:
      assignedStaffId === null
        ? null
        : {
            id: assignedStaffId,
            fullName: 'Staff member',
            specialization: 'Property',
          },
  };
}

describe('App', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('tracks claimant decisions across role switches and keeps staff overflow assignable', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpTesting.expectOne('http://localhost:5202/api/lookups').flush({
      claimants: [
        {
          id: 1,
          fullName: 'Avery Morgan',
          policyNumber: 'POL-1001',
          email: 'avery@example.com',
        },
        {
          id: 2,
          fullName: 'Jordan Taylor',
          policyNumber: 'POL-1002',
          email: 'jordan@example.com',
        },
      ],
      staff: [
        {
          id: 2,
          fullName: 'Riley Chen',
          specialization: 'Auto',
        },
      ],
    });
    httpTesting.expectOne('http://localhost:5202/api/claims').flush([
      {
        id: 7,
        claimantId: 1,
        assignedStaffId: null,
        claimType: 'Property',
        description: 'Water damage',
        claimAmount: 1200,
        status: 'Submitted',
        decisionNotes: null,
        createdAt: '2026-11-25T10:00:00Z',
        claimant: {
          id: 1,
          fullName: 'Avery Morgan',
          policyNumber: 'POL-1001',
          email: 'avery@example.com',
        },
        assignedStaff: null,
      },
      {
        id: 8,
        claimantId: '2',
        assignedStaffId: null,
        claimType: 'Auto',
        description: 'Vehicle damage',
        claimAmount: 900,
        status: 'Submitted',
        decisionNotes: null,
        createdAt: '2026-11-25T11:00:00Z',
        claimant: {
          id: 2,
          fullName: 'Jordan Taylor',
          policyNumber: 'POL-1002',
          email: 'jordan@example.com',
        },
        assignedStaff: null,
      },
    ]);

    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const claimantRows = () =>
      Array.from(element.querySelectorAll('.claims-card tbody tr'));
    expect(claimantRows()).toHaveLength(1);
    expect(claimantRows()[0].textContent).toContain('#7');

    fixture.componentInstance.selectedClaimantId.set(2);
    fixture.detectChanges();
    expect(claimantRows()).toHaveLength(1);
    expect(claimantRows()[0].textContent).toContain('#8');

    fixture.componentInstance.claims.update((claims) => [
      ...claims,
      makeClaim(9, 'Assigned', 2),
      makeClaim(10, 'Assigned', 3),
      makeClaim(11, 'Approved', 2),
    ]);
    fixture.componentInstance.setRole('Claims Staff');
    fixture.detectChanges();

    expect(fixture.componentInstance.staffQueueFilter()).toBe('Actionable');
    expect(element.querySelectorAll('.staff-claim')).toHaveLength(4);
    const filterTabs = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.staff-filter-tab'),
    );
    expect(filterTabs.map((tab) => tab.textContent?.trim())).toEqual([
      'Actionable',
      'Available',
      'My Queue',
      'All',
    ]);

    filterTabs[1].click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.staff-claim')).toHaveLength(2);

    filterTabs[2].click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.staff-claim')).toHaveLength(1);
    expect(element.querySelector('.staff-claim')?.textContent).toContain('#9');

    fixture.componentInstance.selectedStaffId.set(3);
    fixture.detectChanges();
    expect(element.querySelector('.staff-claim')?.textContent).toContain('#10');

    fixture.componentInstance.selectedStaffId.set(2);
    filterTabs[3].click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.staff-claim')).toHaveLength(5);

    filterTabs[0].click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.recommended-match')).toHaveLength(1);
    expect(element.querySelector('.recommended-match')?.textContent?.trim()).toBe(
      'Recommended Match',
    );

    const assignButtons = Array.from(
      element.querySelectorAll<HTMLButtonElement>('.staff-claim-action > button'),
    );
    expect(assignButtons).toHaveLength(2);
    expect(assignButtons.every((button) => !button.disabled)).toBe(true);

    fixture.componentInstance.selectedClaimantId.set(1);
    fixture.componentInstance.refreshClaims();
    httpTesting.expectOne('http://localhost:5202/api/claims').flush([
      {
        id: 7,
        claimantId: 1,
        assignedStaffId: null,
        claimType: 'Property',
        description: 'Water damage',
        claimAmount: 1200,
        status: 'Approved',
        decisionNotes: 'Repair estimate approved',
        createdAt: '2026-11-25T10:00:00Z',
        claimant: {
          id: 1,
          fullName: 'Avery Morgan',
          policyNumber: 'POL-1001',
          email: 'avery@example.com',
        },
        assignedStaff: null,
      },
      {
        id: 8,
        claimantId: '2',
        assignedStaffId: null,
        claimType: 'Auto',
        description: 'Vehicle damage',
        claimAmount: 900,
        status: 'Submitted',
        decisionNotes: null,
        createdAt: '2026-11-25T11:00:00Z',
        claimant: {
          id: 2,
          fullName: 'Jordan Taylor',
          policyNumber: 'POL-1002',
          email: 'jordan@example.com',
        },
        assignedStaff: null,
      },
    ]);

    fixture.componentInstance.setRole('Claimant');
    fixture.detectChanges();
    expect(element.querySelector('.claim-notification')?.textContent).toContain(
      'Claim #7 is now Approved',
    );
    expect(element.querySelector('.claim-notification')?.textContent).toContain(
      'Repair estimate approved',
    );

    element.querySelector<HTMLButtonElement>('.claim-notification-dismiss')?.click();
    fixture.detectChanges();
    expect(element.querySelector('.claim-notification')).toBeNull();
  });
});
