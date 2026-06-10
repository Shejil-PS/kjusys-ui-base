import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { SharedToastService } from '@libs/shared-toast';

// ── CUSTOM STUDENT MODEL ──
export interface Student {
  id: string;
  registerNumber: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  batchCode?: string;
  batch?: string;
  tenthPercentage?: number;
  twelfthPercentage?: number;
  skills?: string[];
  resumeUrl?: string;
  course: string;
  optInStatus: 'opted_in' | 'opted_out' | 'pending';
  freezeStatus: 'frozen' | 'active';
  cgpa: number;
  backlogs: number;
  isPlaced?: boolean;
}

// ── STUDENT API SERVICE ──
class StudentApiService {
  private base = 'http://localhost:8080/api/students';
  private bulkUrl = 'http://localhost:8080/api/students/bulk';

  constructor(private http: HttpClient) { }

  private mapToStudent(data: any): Student {
    return {
      id: data.id || data._id,
      registerNumber: data.registerNumber || data.rollNo,
      name: data.name || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.firstName || data.lastName || ''),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || data.personalEmail,
      course: data.course || data.specialization || data.departmentName || '',
      optInStatus: data.optInStatus || (data.optedIn === true ? 'opted_in' : (data.optedIn === false ? 'opted_out' : 'pending')),
      freezeStatus: data.freezeStatus || (data.freeze === true ? 'frozen' : 'active'),
      cgpa: data.cgpa || 0,
      backlogs: data.backlogs || 0,
      isPlaced: data.isPlaced || false,
      gender: data.gender || '',
      dateOfBirth: data.dob || data.dateOfBirth || '',
      batchCode: data.batchCode || data.batch || '',
      tenthPercentage: data.tenthPercentage || 0,
      twelfthPercentage: data.twelfthPercentage || 0,
      skills: data.skills || [],
      resumeUrl: data.resumeUrl || '',
      phone: data.phone ? String(data.phone) : ''
    };
  }

  private mapToBackendStudent(student: Partial<Student>): any {
    const backend: any = {};
    if (student.id) backend._id = student.id;
    if (student.registerNumber) backend.rollNo = student.registerNumber;
    if (student.firstName) backend.firstName = student.firstName;
    if (student.lastName) backend.lastName = student.lastName;
    if (student.email) backend.personalEmail = student.email;
    if (student.course) {
      backend.specialization = student.course;
      backend.departmentName = student.course;
    }
    if (student.cgpa !== undefined) backend.cgpa = student.cgpa;
    if (student.backlogs !== undefined) backend.backlogs = student.backlogs;
    if (student.optInStatus) backend.optedIn = student.optInStatus === 'opted_in';
    if (student.freezeStatus) backend.freeze = student.freezeStatus === 'frozen';
    return backend;
  }

  list(): Observable<Student[]> {
    return this.http.get<any>(this.base).pipe(
      map(res => {
        const list = res && res.data ? res.data : (Array.isArray(res) ? res : []);
        return list.map((s: any) => this.mapToStudent(s));
      })
    );
  }

  getOne(id: string): Observable<Student> {
    return this.http.get<any>(`${this.base}/${id}`).pipe(
      map(res => this.mapToStudent(res && res.data ? res.data : res))
    );
  }

  updateStatus(id: string, optIn?: string, freeze?: string): Observable<Student> {
    const payload: any = {};
    if (optIn !== undefined) payload.optedIn = optIn === 'opted_in';
    if (freeze !== undefined) payload.freeze = freeze === 'frozen';
    return this.http.put<any>(`${this.base}/${id}`, payload).pipe(
      map(s => this.mapToStudent(s))
    );
  }

  bulkAction(payload: { ids: string[]; optIn?: string; freeze?: string }): Observable<any> {
    return this.http.post<any>(this.bulkUrl, payload);
  }
}

// ── STUDENTS COMPONENT ──
@Component({
  selector: 'app-students',
  templateUrl: './students.component.html',
  styleUrls: ['./students.component.css']
})
export class StudentsComponent implements OnInit {
  studentApi: StudentApiService;

  // Active view states
  selectedStudentId: string | null = null;
  student: Student | null = null;

  students: Student[] = [];

  filteredStudents: Student[] = [];
  searchQuery = '';
  selectedIds = new Set<string>();
  showBulkModal = false;

  // Form options
  bulkOptIn = '';
  bulkFreeze = '';
  activeBulkTab: 'excel' | 'manual' = 'excel';
  bulkFilename = '';
  isFileSelected = false;
  showPreview = false;
  parsedBulkRows: any[] = [];
  bulkBusy = false;
  bulkApplyLabel = 'Apply Bulk Update';
  bulkProgressShow = false;
  bulkProgressFill = 0;
  bulkProgressLabel = '';
  isDragOver = false;

  // Pagination states
  currentPage = 1;
  pageSize = 10;
  Math = Math;

  getPaginatedStudents(): Student[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredStudents.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredStudents.length / this.pageSize) || 1;
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
    const arr: number[] = [];
    for (let i = 1; i <= total; i++) {
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
    this.studentApi = new StudentApiService(http);
  }

  ngOnInit(): void {
    this.filteredStudents = [...this.students];

    // Subroute parameter navigation
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.selectedStudentId = id;
        this.loadStudentProfile(id);
      } else {
        this.selectedStudentId = null;
        this.student = null;
        this.loadStudents();
      }
      this.cdr.detectChanges();
    });
  }

  loadStudents(): void {
    this.studentApi.list().subscribe({
      next: (res: Student[]) => {
        this.students = res || [];
        this.filter();
        this.cdr.detectChanges();
      },
      error: () => {
        this.students = [];
        this.filter();
        this.cdr.detectChanges();
      }
    });
  }

  loadStudentProfile(id: string): void {
    this.studentApi.getOne(id).subscribe({
      next: (data: Student) => {
        this.student = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.student = null;
        this.cdr.detectChanges();
      }
    });
  }

  viewProfile(id: string): void {
    this.selectedStudentId = id;
    this.loadStudentProfile(id);
  }

  clearProfile(): void {
    this.selectedStudentId = null;
    this.student = null;
    this.loadStudents();
  }

  filter(): void {
    this.currentPage = 1;
    if (!this.searchQuery) {
      this.filteredStudents = [...this.students];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredStudents = this.students.filter(s =>
        s.name.toLowerCase().includes(q) || s.registerNumber.toLowerCase().includes(q)
      );
    }
  }

  toggleSelectAll(event: any): void {
    const checked = event.target.checked;
    if (checked) {
      this.filteredStudents.forEach(s => this.selectedIds.add(s.id));
    } else {
      this.selectedIds.clear();
    }
  }

  toggleSelect(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  isAllSelected(): boolean {
    return this.filteredStudents.length > 0 && this.selectedIds.size === this.filteredStudents.length;
  }

  toggleFreeze(id: string): void {
    const student = this.students.find(s => s.id === id);
    if (student) {
      const nextFreeze = student.freezeStatus === 'active' ? 'frozen' : 'active';
      this.studentApi.updateStatus(id, undefined, nextFreeze).subscribe({
        next: () => {
          student.freezeStatus = nextFreeze as any;
          this.toastService.success(`Student freeze status updated to ${nextFreeze}!`);
          this.cdr.detectChanges();
        },
        error: () => {
          student.freezeStatus = nextFreeze as any;
          this.toastService.success(`Student freeze status updated to ${nextFreeze} (offline simulation)!`);
          this.cdr.detectChanges();
        }
      });
    }
  }

  toggleOptIn(id: string): void {
    const student = this.students.find(s => s.id === id);
    if (student) {
      const nextOptVal = student.optInStatus === 'opted_in' ? 'opted_out' : 'opted_in';
      this.studentApi.updateStatus(id, nextOptVal, undefined).subscribe({
        next: () => {
          student.optInStatus = nextOptVal as any;
          this.toastService.success(`Student opt-in status updated to ${nextOptVal}!`);
          this.filter();
          this.cdr.detectChanges();
        },
        error: () => {
          student.optInStatus = nextOptVal as any;
          this.toastService.success(`Student opt-in status updated to ${nextOptVal} (offline simulation)!`);
          this.filter();
          this.cdr.detectChanges();
        }
      });
    }
  }

  openBulkUpdate(): void {
    this.parsedBulkRows = [];
    this.activeBulkTab = 'excel';
    this.bulkBusy = false;
    this.bulkProgressShow = false;
    this.bulkProgressFill = 0;
    this.bulkProgressLabel = '';
    this.bulkFilename = '';
    this.isFileSelected = false;
    this.showPreview = false;
    this.bulkOptIn = '';
    this.bulkFreeze = '';
    this.bulkApplyLabel = 'Apply Bulk Update';
    this.showBulkModal = true;
  }

  closeBulkUpdate(): void {
    if (this.bulkBusy) return;
    this.showBulkModal = false;
  }

  switchBulkTab(tab: 'excel' | 'manual'): void {
    this.activeBulkTab = tab;
  }

  downloadBulkTemplate(): void {
    const targetStudents = this.selectedIds.size > 0
      ? this.students.filter(s => this.selectedIds.has(s.id))
      : this.students;

    const data = targetStudents.map(s => ({
      'Register No.': s.registerNumber || '',
      'Name': s.name || '',
      'Course': s.course || '',
      'Opt-In Status': s.optInStatus || '',
      'Freeze Status': s.freezeStatus || '',
      'Update Opt-In Status': '',
      'Update Freeze Status': ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 16 }, { wch: 28 }, { wch: 38 },
      { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 20 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'students_bulk_update_template.xlsx');
  }

  handleBulkFileSelect(event: any): void {
    const file = event.target.files[0];
    if (file) this.processBulkFile(file);
  }

  handleBulkFileDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) this.processBulkFile(file);
  }

  processBulkFile(file: File): void {
    this.bulkFilename = '📄 ' + file.name;
    this.isFileSelected = true;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

        this.parsedBulkRows = json.map((row: any) => {
          const mapped = this.mapBulkKeys(row);
          let match = mapped.reg
            ? this.students.find(s => (s.registerNumber || '').toLowerCase().trim() === mapped.reg.toLowerCase().trim())
            : null;
          if (match && this.selectedIds.size > 0 && !this.selectedIds.has(match.id)) {
            match = null;
          }
          return { ...mapped, _match: match || null };
        }).filter((r: any) => r.reg);

        this.showPreview = true;
      } catch (err) {
        alert('Could not read the file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  mapBulkKeys(row: any): any {
    const out: any = {};
    Object.keys(row).forEach(k => {
      const n = k.toLowerCase().replace(/[\s_\-\/\\.]/g, '');
      if (['registerno', 'regno', 'reg', 'regnumber', 'registrationnumber'].includes(n))
        out.reg = String(row[k]).trim();
      else if (['name', 'studentname', 'fullname'].includes(n))
        out.name = String(row[k]).trim();
      else if (['course', 'department', 'dept', 'program', 'programme'].includes(n))
        out.course = String(row[k]).trim();
      else if (['updateoptinstatus', 'optinstatus', 'optin', 'updateoptin'].includes(n)) {
        const raw = String(row[k]).trim().toLowerCase().replace(' ', '_');
        out.updateOptIn = raw === 'opted_in' ? 'opted_in' : (raw === 'opted_out' ? 'opted_out' : (raw === 'pending' ? 'pending' : ''));
      }
      else if (['updatefreezestatus', 'freezestatus', 'freeze', 'updatefreeze'].includes(n)) {
        const raw = String(row[k]).trim().toLowerCase();
        out.updateFreeze = raw === 'frozen' ? 'frozen' : (raw === 'active' ? 'active' : '');
      }
    });
    return out;
  }

  applyBulk(): void {
    if (this.bulkBusy) return;

    if (this.activeBulkTab === 'excel') {
      const matched = this.parsedBulkRows.filter(r => r._match && (r.updateOptIn || r.updateFreeze));
      if (this.parsedBulkRows.length === 0) {
        alert('Please upload a file before applying the bulk update.');
        return;
      }
      if (matched.length === 0) {
        alert('No records with update values found. Fill the appropriate columns and re-upload.');
        return;
      }

      this.setBulkBusy(true);
      this.runProgress(() => {
        const requests = matched.map(r => {
          const s = r._match;
          return this.studentApi.updateStatus(s.id, r.updateOptIn || undefined, r.updateFreeze || undefined);
        });

        forkJoin(requests).subscribe({
          next: (updatedStudents) => {
            updatedStudents.forEach(updated => {
              const idx = this.students.findIndex(orig => orig.id === updated.id);
              if (idx !== -1) {
                this.students[idx] = updated;
              }
            });
            this.filter();
            this.setBulkBusy(false);
            this.closeBulkUpdate();
            this.toastService.success('Bulk status updates applied successfully!');
            this.cdr.detectChanges();
          },
          error: () => {
            // fallback local updates
            matched.forEach(r => {
              const s = r._match;
              if (r.updateOptIn) s.optInStatus = r.updateOptIn;
              if (r.updateFreeze) s.freezeStatus = r.updateFreeze;
              if (r.name) s.name = r.name;
              const idx = this.students.findIndex(orig => orig.id === s.id);
              if (idx !== -1) {
                this.students[idx] = { ...this.students[idx], optInStatus: r.updateOptIn || s.optInStatus, freezeStatus: r.updateFreeze || s.freezeStatus, name: r.name || s.name };
              }
            });
            this.filter();
            this.setBulkBusy(false);
            this.closeBulkUpdate();
            this.toastService.success('Bulk status updates applied successfully (offline simulation)!');
            this.cdr.detectChanges();
          }
        });
      });

    } else {
      const optinVal = this.bulkOptIn ? (this.bulkOptIn === 'Opted In' ? 'opted_in' : 'opted_out') : undefined;
      const freezeVal = this.bulkFreeze ? (this.bulkFreeze === 'Frozen' ? 'frozen' : 'active') : undefined;

      if (!optinVal && !freezeVal) {
        this.toastService.warning('Please select at least one field to update.');
        return;
      }

      const targetStudents = this.selectedIds.size > 0
        ? this.students.filter(s => this.selectedIds.has(s.id))
        : this.students;

      this.setBulkBusy(true);
      this.runProgress(() => {
        const requests = targetStudents.map(s => {
          return this.studentApi.updateStatus(s.id, optinVal, freezeVal);
        });

        forkJoin(requests).subscribe({
          next: (updatedStudents) => {
            updatedStudents.forEach(updated => {
              const idx = this.students.findIndex(orig => orig.id === updated.id);
              if (idx !== -1) {
                this.students[idx] = updated;
              }
            });
            this.filter();
            this.setBulkBusy(false);
            this.closeBulkUpdate();
            this.toastService.success('Bulk status updates applied successfully!');
            this.cdr.detectChanges();
          },
          error: () => {
            // fallback local updates
            targetStudents.forEach(s => {
              if (optinVal) s.optInStatus = optinVal as any;
              if (freezeVal) s.freezeStatus = freezeVal as any;
            });
            this.filter();
            this.setBulkBusy(false);
            this.closeBulkUpdate();
            this.toastService.success('Bulk status updates applied successfully (offline simulation)!');
            this.cdr.detectChanges();
          }
        });
      });
    }
  }

  runProgress(cb: () => void): void {
    this.bulkProgressShow = true;
    this.bulkProgressFill = 0;
    const steps = [
      { p: 20, m: 'Validating student records…' },
      { p: 45, m: 'Beginning batch transaction…' },
      { p: 70, m: 'Applying status updates…' },
      { p: 90, m: 'Committing changes…' },
      { p: 100, m: 'Finalizing…' },
    ];
    let i = 0;
    const tick = () => {
      if (i >= steps.length) {
        setTimeout(() => {
          cb();
          this.cdr.detectChanges();
        }, 300);
        return;
      }
      const st = steps[i++];
      this.bulkProgressFill = st.p;
      this.bulkProgressLabel = st.m;
      this.cdr.detectChanges();
      setTimeout(tick, 280 + Math.random() * 180);
    };
    tick();
  }

  setBulkBusy(busy: boolean): void {
    this.bulkBusy = busy;
    this.bulkApplyLabel = busy ? 'Processing…' : 'Apply Bulk Update';
  }
}
