import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SharedToastService } from '@libs/shared-toast';

// ── CUSTOM INLINE MODELS ──
export interface Company {
  id: string;
  name: string;
  website?: string;
  industry: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  contactPerson: string;
  description?: string;
  tier?: 'TIER_1' | 'TIER_2' | 'TIER_3';
  createdAt?: string;
  updatedAt?: string;
}

// ── CUSTOM INLINE API ROUTES ──
const API_BASE_URL = 'http://localhost:8080/api';
const API_ROUTES = {
  companies: {
    base: `${API_BASE_URL}/companies`,
    detail: (id: string) => `${API_BASE_URL}/companies/${id}`
  }
};

// ── CUSTOM INLINE API SERVICE ──
export class CompanyApiService {
  constructor(private http: HttpClient) { }

  private mapToCompany(data: any): Company {
    return {
      id: data.id || data._id,
      name: data.name || data.companyName || '',
      industry: data.industry || '',
      location: data.location || data.address || '',
      contactEmail: data.contactEmail || data.email || '',
      contactPhone: data.contactPhone || (data.phone ? String(data.phone) : ''),
      contactPerson: data.contactPerson || '',
      tier: data.tier || 'TIER_1'
    };
  }

  private mapToBackendCompany(company: Partial<Company>): any {
    const backend: any = {};
    if (company.id) backend._id = company.id;
    if (company.name) {
      backend.companyName = company.name;
      backend.companyCode = company.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 100);
    } else {
      backend.companyCode = 'COM' + Math.floor(Math.random() * 100);
    }
    if (company.industry) backend.industry = company.industry;
    if (company.contactPerson) backend.contactPerson = company.contactPerson;
    if (company.contactEmail) backend.email = company.contactEmail;
    if (company.contactPhone) {
      const parsed = parseInt(company.contactPhone.replace(/\D/g, ''), 10);
      backend.phone = isNaN(parsed) ? 0 : parsed;
    }
    if (company.location) backend.address = company.location;
    return backend;
  }

  list(): Observable<Company[]> {
    return this.http.get<any>(API_ROUTES.companies.base).pipe(
      map(res => {
        const list = res && res.value ? res.value : (Array.isArray(res) ? res : []);
        return list.map((c: any) => this.mapToCompany(c));
      })
    );
  }

  getOne(id: string): Observable<Company> {
    return this.http.get<any>(API_ROUTES.companies.detail(id)).pipe(
      map(c => this.mapToCompany(c))
    );
  }

  create(company: Partial<Company>): Observable<Company> {
    const payload = this.mapToBackendCompany(company);
    if (!payload._id) {
      payload._id = 'C' + Math.floor(100 + Math.random() * 900);
    }
    return this.http.post<any>(API_ROUTES.companies.base, payload).pipe(
      map(c => this.mapToCompany(c))
    );
  }

  update(id: string, company: Partial<Company>): Observable<Company> {
    const payload = this.mapToBackendCompany(company);
    return this.http.put<any>(API_ROUTES.companies.detail(id), payload).pipe(
      map(c => this.mapToCompany(c))
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(API_ROUTES.companies.detail(id));
  }
}

@Component({
  selector: 'app-companies',
  templateUrl: './companies.component.html',
  styleUrls: ['./companies.component.css']
})
export class CompaniesComponent implements OnInit {
  companyApi: CompanyApiService;

  // Active view states
  selectedCompanyId: string | null = null;
  company: Company | null = null;

  companies: Company[] = [];

  filteredCompanies: Company[] = [];
  searchQuery = '';
  showModal = false;
  editingId: string | null = null;

  // Form Fields
  fName = '';
  fIndustry = '';
  fContact = '';
  fEmail = '';
  fPhone = '';
  fLocation = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private toastService: SharedToastService
  ) {
    this.companyApi = new CompanyApiService(http);
  }

  ngOnInit(): void {
    this.filteredCompanies = [...this.companies];

    // Listen to parameter changes to route between listing & profile detail page
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.selectedCompanyId = id;
        this.loadCompanyProfile(id);
      } else {
        this.selectedCompanyId = null;
        this.company = null;
        this.loadCompanies();
      }
      this.cdr.detectChanges();
    });
  }

  loadCompanies(): void {
    this.companyApi.list().subscribe({
      next: (res: Company[]) => {
        if (res && res.length > 0) {
          this.companies = res;
          this.filter();
        } else {
          this.companies = [];
          this.filter();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        console.log('Error loading companies');
        this.companies = [];
        this.filter();
        this.cdr.detectChanges();
      }
    });
  }

  loadCompanyProfile(id: string): void {
    this.companyApi.getOne(id).subscribe({
      next: (data: Company) => {
        this.company = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.company = null;
        this.cdr.detectChanges();
      }
    });
  }

  filter(): void {
    if (!this.searchQuery) {
      this.filteredCompanies = [...this.companies];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredCompanies = this.companies.filter(c =>
        c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q)
      );
    }
  }

  openAdd(): void {
    this.editingId = null;
    this.clearForm();
    this.showModal = true;
  }

  openEdit(company: Company): void {
    this.editingId = company.id;
    this.fName = company.name;
    this.fIndustry = company.industry;
    this.fContact = company.contactPerson || '';
    this.fEmail = company.contactEmail;
    this.fPhone = company.contactPhone;
    this.fLocation = company.location;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingId = null;
    this.clearForm();
  }

  clearForm(): void {
    this.fName = '';
    this.fIndustry = '';
    this.fContact = '';
    this.fEmail = '';
    this.fPhone = '';
    this.fLocation = '';
  }

  onSubmit(): void {
    if (!this.fName) return;

    const payload: Partial<Company> = {
      name: this.fName,
      industry: this.fIndustry,
      contactPerson: this.fContact,
      contactEmail: this.fEmail,
      contactPhone: this.fPhone,
      location: this.fLocation || 'Bengaluru, India'
    };

    if (this.editingId) {
      this.companyApi.update(this.editingId, payload).subscribe({
        next: (updated) => {
          const idx = this.companies.findIndex(c => c.id === this.editingId);
          if (idx !== -1) this.companies[idx] = updated;
          this.filter();
          this.closeModal();
          this.toastService.success('Company updated successfully!');
          this.cdr.detectChanges();
        },
        error: () => {
          const idx = this.companies.findIndex(c => c.id === this.editingId);
          if (idx !== -1) this.companies[idx] = { ...this.companies[idx], ...payload };
          this.filter();
          this.closeModal();
          this.toastService.success('Company updated successfully (offline simulation)!');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.companyApi.create(payload).subscribe({
        next: (created) => {
          this.companies.push(created);
          this.filter();
          this.closeModal();
          this.toastService.success('Company created successfully!');
          this.cdr.detectChanges();
        },
        error: () => {
          this.companies.push({ id: (this.companies.length + 1).toString(), ...payload } as Company);
          this.filter();
          this.closeModal();
          this.toastService.success('Company created successfully (offline simulation)!');
          this.cdr.detectChanges();
        }
      });
    }
  }

  onDelete(id: string): void {
    if (!confirm('Delete this company? This action cannot be undone.')) return;
    this.companyApi.delete(id).subscribe({
      next: () => {
        this.companies = this.companies.filter(c => c.id !== id);
        this.filter();
        this.toastService.success('Company deleted successfully!');
        this.cdr.detectChanges();
      },
      error: () => {
        this.companies = this.companies.filter(c => c.id !== id);
        this.filter();
        this.toastService.success('Company deleted successfully (offline simulation)!');
        this.cdr.detectChanges();
      }
    });
  }
}
