import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

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

  it('loads claim lookups and renders the role switcher', () => {
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
      ],
      staff: [],
    });
    httpTesting.expectOne('http://localhost:5202/api/claims').flush([]);
    fixture.detectChanges();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.role-option'),
    );
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      '◉ Claimant',
      '◈ Claims Staff',
      '▥ Manager',
    ]);
  });
});
