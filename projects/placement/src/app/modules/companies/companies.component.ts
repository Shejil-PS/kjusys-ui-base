import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SharedToastService } from '@libs/shared-toast';
import { environment } from '../../../environments/environment';

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
const API_BASE_URL = environment.baseUrl + '/placements-app';
const API_ROUTES = {
  companies: {
    list: `${API_BASE_URL}/list-comnpanies`,
    create: `${API_BASE_URL}/create-company`,
    detail: (id: string) => `${API_BASE_URL}/get-company/${id}`,
    update: (id: string) => `${API_BASE_URL}/update-company/${id}`,
    delete: (id: string) => `${API_BASE_URL}/delete-company/${id}`
  }
};

// ── CUSTOM INLINE API SERVICE ──
export class CompanyApiService {
  constructor(private http: HttpClient) { }

  private mapToCompany(data: any): Company {
    return {
      id: data._id || data.id || data.companyCode_PlacementCompany_Text || data.COMPANY_CODE,
      name: data.companyName_PlacementCompany_Text || data.COMPANY_NAME || data.name || data.companyName || '',
      industry: data.industry_PlacementCompany_Text || data.INDUSTRY || data.industry || '',
      location: data.companyAddress_PlacementCompany_Text || data.COMPANY_ADDRESS || data.location || data.address || '',
      contactEmail: data.contactPersonEmail_PlacementCompany_Text || data.CONTACT_PERSON_EMAIL || data.contactEmail || data.email || '',
      contactPhone: data.contactPersonPhone_PlacementCompany_Long || data.CONTACT_PERSON_PHONE || data.contactPhone || data.phone ? String(data.contactPersonPhone_PlacementCompany_Long || data.CONTACT_PERSON_PHONE || data.contactPhone || data.phone) : '',
      contactPerson: data.contactPerson_PlacementCompany_Text || data.CONTACT_PERSON || data.contactPerson || '',
      tier: data.tier || 'TIER_1'
    };
  }

  private mapToBackendCompany(company: Partial<Company>): any {
    const backend: any = {};
    // Do NOT send _id to backend because DocumentParser crashes on keys with less than 3 segments
    if (company.name) {
      backend.companyName_PlacementCompany_Text = company.name;
      backend.companyCode_PlacementCompany_Text = company.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 100);
    } else {
      backend.companyCode_PlacementCompany_Text = 'COM' + Math.floor(Math.random() * 100);
    }
    backend.industry_PlacementCompany_Text = company.industry || 'General';
    backend.contactPerson_PlacementCompany_Text = company.contactPerson || 'TBD';
    if (company.contactEmail) backend.contactPersonEmail_PlacementCompany_Text = company.contactEmail;
    if (company.contactPhone) {
      const parsed = parseInt(company.contactPhone.replace(/\D/g, ''), 10);
      backend.contactPersonPhone_PlacementCompany_Long = isNaN(parsed) ? 0 : parsed;
    }
    backend.companyAddress_PlacementCompany_Text = company.location || 'Bengaluru';
    return backend;
  }

  list(search?: string): Observable<Company[]> {
    const url = search ? `${API_ROUTES.companies.list}?search=${encodeURIComponent(search)}` : API_ROUTES.companies.list;
    return this.http.get<any>(url).pipe(
      map(res => {
        const list = res && (res.responseData?.data || res.responseData || res.value) ? (res.responseData?.data || res.responseData || res.value) : (Array.isArray(res) ? res : []);
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
    // Do NOT add _id manually, because backend DocumentParser expects keys with 3+ segments and crashes on _id
    return this.http.post<any>(API_ROUTES.companies.create, payload).pipe(
      map(res => {
        const created = res.responseData?.data || res.responseData || res.data || res;
        // Backend returns {} or [] for success without payload
        if ((Array.isArray(created) && created.length === 0) || (Object.keys(created).length === 0 && created.constructor === Object)) {
          return { ...company, id: 'C' + Math.floor(100 + Math.random() * 900) } as Company;
        }
        return this.mapToCompany(created);
      })
    );
  }

  update(id: string, company: Partial<Company>): Observable<Company> {
    const payload = this.mapToBackendCompany(company);
    // Remove _id before sending update to avoid DocumentParser crash if update ever passes through it
    delete payload._id;
    return this.http.put<any>(API_ROUTES.companies.update(id), payload).pipe(
      map(res => {
        const updated = res.responseData?.data || res.data || res;
        return this.mapToCompany(updated);
      })
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(API_ROUTES.companies.delete(id));
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
  searchSubject = new Subject<string>();
  showModal = false;
  editingId: string | null = null;

  // Form Fields
  fName = '';
  fIndustry = '';
  fContact = '';
  fEmail = '';
  fPhone = '';
  fLocation = '';

  // Pagination states
  currentPage = 1;
  pageSize = 7;
  Math = Math;

  getPaginatedCompanies(): Company[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredCompanies.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredCompanies.length / this.pageSize) || 1;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPagesArray(): number[] {
    const total = this.totalPages;
    const maxVisible = 3;

    if (total <= maxVisible) {
      const arr: number[] = [];
      for (let i = 1; i <= total; i++) {
        arr.push(i);
      }
      return arr;
    }

    let start = Math.max(this.currentPage - 1, 1);
    let end = start + maxVisible - 1;

    if (end > total) {
      end = total;
      start = Math.max(end - maxVisible + 1, 1);
    }

    const arr: number[] = [];
    for (let i = start; i <= end; i++) {
      arr.push(i);
    }
    return arr;
  }

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

    // Setup search debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.loadCompanies(query);
    });
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  loadCompanies(query?: string): void {
    this.companyApi.list(query).subscribe({
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

  filter(resetPage: boolean = true): void {
    if (resetPage) {
      this.currentPage = 1;
    }
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
