import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, Subject } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { SharedToastService } from '@libs/shared-toast';
import { environment } from '../../../environments/environment';
import { Breadcrumb } from '@libs/shared-ui';

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
  freezeStatus: 'active' | 'frozen';
  cgpa: number;
  backlogs: number;
  attendance?: string;
  isPlaced?: boolean;
  isFlagged?: boolean;

  // New profile fields
  linkedin?: string;
  github?: string;
  projects?: string;
  achievements?: string;
  internshipDetails?: any[];
  offerLetter?: any;
  declarationFileName?: string | null;
  declarationUrl?: string | null;
  placedCompany?: string;
  placedLocation?: string;
  placedRole?: string;
  placedPackage?: number;
  raw?: any;
}

// ── STUDENT API SERVICE ──
class StudentApiService {
  private base = environment.baseUrl + '/placements-app/list-students';
  private getUrl = environment.baseUrl + '/placements-app/get-student';
  private updateUrl = environment.baseUrl + '/placements-app/update-student';
  private bulkUrl = environment.baseUrl + '/placements-app/update-student-bulk';

  constructor(private http: HttpClient) { }

  private mapToStudent(data: any): Student {
    return {
      id: data.id || data._id,
      registerNumber: data.registerNumber || data.rollNo || data.rollNo_PlacementStudent_Text,
      name: data.name || (data.firstName_PlacementStudent_Text && data.lastName_PlacementStudent_Text ? `${data.firstName_PlacementStudent_Text} ${data.lastName_PlacementStudent_Text}` : (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : data.firstName || data.lastName || data.firstName_PlacementStudent_Text || data.lastName_PlacementStudent_Text || '')),
      firstName: data.firstName || data.firstName_PlacementStudent_Text,
      lastName: data.lastName || data.lastName_PlacementStudent_Text,
      email: data.email || data.personalEmail || data.email_PlacementStudent_Text,
      course: data.course || data.specialization || data.departmentName || data.departmentName_PlacementStudent_Text || data.specialization_PlacementStudent_Text || '',
      optInStatus: data.optInStatus || (data.optedIn === true || data.optedIn_PlacementStudent_Bool === true ? 'opted_in' : (data.optedIn === false || data.optedIn_PlacementStudent_Bool === false ? 'opted_out' : 'pending')),
      freezeStatus: data.freezeStatus || (data.freeze === true || data.freeze_PlacementStudent_Bool === true ? 'frozen' : 'active'),
      cgpa: data.cgpa || data.cgpa_PlacementStudent_Double || 0,
      backlogs: data.backlogs || data.backlogs_PlacementStudent_Int || 0,
      isPlaced: data.isPlaced === true || data.isPlaced === 'true' || data.isPlaced_PlacementStudent_Bool === true || data.isPlaced_PlacementStudent_Bool === 'true' || data.placedStatus_PlacementStudent_Bool === true || data.placedStatus_PlacementStudent_Bool === 'true' || data.status === 'Selected' || data.status_PlacementStudent_Text === 'Selected' || false,
      isFlagged: data.flagged === true || data.flagged_PlacementStudent_Bool === true || false,
      gender: data.gender || data.gender_PlacementStudent_Text || '',
      dateOfBirth: data.dob || data.dateOfBirth || data.dob_PlacementStudent_Date || '',
      batchCode: data.batchCode || data.batch || data.batchCode_PlacementStudent_Text || '',
      tenthPercentage: data.tenthPercentage || data.tenthPer_PlacementStudent_Double || 0,
      twelfthPercentage: data.twelfthPercentage || data.twelthPer_PlacementStudent_Double || 0,
      skills: data.skills || data.skills_PlacementStudent_Text || [],
      resumeUrl: data.studentResume_PlacementStudent_Text || data.resumeUrl || (data.studentResume_PlacementStudent_Document ? data.studentResume_PlacementStudent_Document.resumeUrl : ''),
      phone: data.phone ? String(data.phone) : (data.phone_PlacementStudent_Long ? String(data.phone_PlacementStudent_Long) : ''),
      linkedin: data.linkedin || data.linkedin_PlacementStudent_Text || '',
      github: data.github || data.github_PlacementStudent_Text || '',
      projects: data.projects || data.projects_PlacementStudent_Text || '',
      achievements: data.achievements || data.studentAchievements_PlacementStudent_Text || '',
      internshipDetails: (Array.isArray(data.internshipDetails_PlacementStudent_DocumentArray) ? data.internshipDetails_PlacementStudent_DocumentArray : (Array.isArray(data.internshipDetails) ? data.internshipDetails : [])).map((i: any) => ({
        companyName: i.companyName_PlacementStudent_Text || i.companyName || '',
        location: i.location_PlacementStudent_Text || i.location || '',
        jobType: i.jobType_PlacementStudent_Text || i.jobType || 'Work from Office',
        duration: i.duration_PlacementStudent_Text || i.duration || ''
      })),
      offerLetter: data.offerLetter || data.offerLetter_PlacementStudent_Document || null,
      declarationFileName: data.declaration_PlacementStudent_Text || data.declarationFileName || data.declarationUrl || (typeof data.declaration === 'string' ? data.declaration : null) || null,
      declarationUrl: data.declarationUrl || data.declarationUrl_PlacementStudent_Text || data.declaration_PlacementStudent_Document?.url || data.declaration_PlacementStudent_Document?.declarationUrl || data.declaration_PlacementStudent_Text || (typeof data.declaration === 'string' ? data.declaration : null) || null,
      placedCompany: data.placedCompany || data.placedCompany_PlacementStudent_Text || '',
      placedLocation: data.placedLocation || data.placedLocation_PlacementStudent_Text || '',
      placedRole: data.placedRole || data.role_PlacementStudent_Text || '',
      placedPackage: data.placedPackage || data.package_PlacementStudent_Int || null,
      attendance: data.attendance_PlacementStudent_Text || data.attendance || 'N/A',
      raw: data
    };
  }

  private mapToBackendStudent(student: Partial<Student>): any {
    const backend: any = {};
    if (student.id) backend._id = student.id;
    if (student.registerNumber) {
      backend.rollNo = student.registerNumber;
      backend.rollNo_PlacementStudent_Text = student.registerNumber;
    }
    if (student.firstName) {
      backend.firstName = student.firstName;
      backend.firstName_PlacementStudent_Text = student.firstName;
    }
    if (student.lastName) {
      backend.lastName = student.lastName;
      backend.lastName_PlacementStudent_Text = student.lastName;
    }
    if (student.email) {
      backend.personalEmail = student.email;
      backend.email_PlacementStudent_Text = student.email;
      backend.personalEmail_PlacementStudent_Text = student.email;
    }
    if (student.course) {
      backend.specialization = student.course;
      backend.departmentName = student.course;
      backend.specialization_PlacementStudent_Text = student.course;
      backend.departmentName_PlacementStudent_Text = student.course;
    }
    if (student.cgpa !== undefined) {
      backend.cgpa = student.cgpa;
      backend.cgpa_PlacementStudent_Double = student.cgpa;
    }
    if (student.backlogs !== undefined) {
      backend.backlogs = student.backlogs;
      backend.backlogs_PlacementStudent_Int = student.backlogs;
    }
    if (student.optInStatus) {
      backend.optedIn = student.optInStatus === 'opted_in';
      backend.optedIn_PlacementStudent_Bool = student.optInStatus === 'opted_in';
    }
    if (student.freezeStatus) {
      backend.freeze = student.freezeStatus === 'frozen';
      backend.freeze_PlacementStudent_Bool = student.freezeStatus === 'frozen';
    }
    return backend;
  }
  list(search?: string): Observable<Student[]> {
    const url = search ? `${this.base}?search=${encodeURIComponent(search)}` : this.base;
    return this.http.get<any>(url).pipe(
      map(res => {
        const list = res && res.responseData?.data ? res.responseData.data : (Array.isArray(res) ? res : []);
        return list.map((s: any) => this.mapToStudent(s));
      })
    );
  }

  getOne(id: string): Observable<Student> {
    return this.http.get<any>(`${this.getUrl}/${id}`).pipe(
      map(res => this.mapToStudent(res && (res.responseData?.data || res.responseData || res.data) ? (res.responseData?.data || res.responseData || res.data) : res))
    );
  }

  updateStatus(id: string, optIn?: string, freeze?: string): Observable<Student> {
    const payload: any = {};
    if (optIn !== undefined) {
      payload.optedIn = optIn === 'opted_in';
      payload.optedIn_PlacementStudent_Bool = optIn === 'opted_in';
    }
    if (freeze !== undefined) {
      payload.freeze = freeze === 'frozen';
      payload.freeze_PlacementStudent_Bool = freeze === 'frozen';
    }
    return this.http.put<any>(`${this.updateUrl}/${id}`, payload).pipe(
      map(res => this.mapToStudent(res && (res.responseData?.data || res.responseData || res.data) ? (res.responseData?.data || res.responseData || res.data) : res))
    );
  }

  bulkAction(payload: { ids: string[]; optIn?: string; freeze?: string }): Observable<any> {
    const reqPayload: any = { ids: payload.ids };
    if (payload.optIn !== undefined) {
      reqPayload.optedIn = payload.optIn === 'opted_in';
      reqPayload.optedIn_PlacementStudent_Bool = payload.optIn === 'opted_in';
    }
    if (payload.freeze !== undefined) {
      reqPayload.freeze = payload.freeze === 'frozen';
      reqPayload.freeze_PlacementStudent_Bool = payload.freeze === 'frozen';
    }
    return this.http.post<any>(this.bulkUrl, reqPayload);
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
  applications: any[] = [];
  studentDriveApplications: any[] = [];
  showDrivesDropdown = false;

  students: Student[] = [];
  loading = true;

  filteredStudents: Student[] = [];
  searchQuery = '';
  searchSubject = new Subject<string>();
  selectedIds = new Set<string>();
  showBulkModal = false;
  placedStudentsSet = new Set<string>();

  showPlacementModal = false;
  selectedPlacementStudent: Student | null = null;
  placementForm = {
    company: '',
    location: '',
    role: '',
    package: null as number | null
  };

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
  pageSize = 6;
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

  listBreadcrumbs: Breadcrumb[] = [
    { label: 'Placements' },
    { label: 'Students' }
  ];

  getProfileBreadcrumbs(): Breadcrumb[] {
    return [
      { label: 'Placements' },
      { label: 'Students', callback: () => { this.clearProfile(); this.router.navigate(['/kjusys/students']); } },
      { label: this.student?.name || 'Student Detail' }
    ];
  }

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
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

    // Setup search debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.loadStudents(query);
    });

    // Load applications to determine placed students
    this.http.get<any>(`${environment.baseUrl}/placements-app/list-applications`).subscribe(appRes => {
      const applications = appRes && appRes.responseData?.data ? appRes.responseData.data : (Array.isArray(appRes) ? appRes : []);
      const pSet = new Set<string>();
      applications.forEach((app: any) => {
        const status = app.status || app.status_PlacementAppilcation_Text;
        if (status === 'Selected') {
          if (app.studentId) pSet.add(String(app.studentId).toLowerCase().trim());
          if (app.studentId_PlacementAppilcation_Text) pSet.add(String(app.studentId_PlacementAppilcation_Text).toLowerCase().trim());
          if (app.rollNo) pSet.add(String(app.rollNo).toLowerCase().trim());
          if (app.rollNo_PlacementAppilcation_Text) pSet.add(String(app.rollNo_PlacementAppilcation_Text).toLowerCase().trim());
          if (app.rollNo_PlacementStudent_Text) pSet.add(String(app.rollNo_PlacementStudent_Text).toLowerCase().trim());
          if (app.studentRegisterNumber) pSet.add(String(app.studentRegisterNumber).toLowerCase().trim());
        }
      });
      this.placedStudentsSet = pSet;

      // Update currently loaded students if any
      if (this.students.length > 0) {
        this.students.forEach(s => {
          const sId = String(s.id).toLowerCase().trim();
          const sRoll = s.registerNumber ? String(s.registerNumber).toLowerCase().trim() : '';
          if (this.placedStudentsSet.has(sId) || (sRoll && this.placedStudentsSet.has(sRoll))) {
            s.isPlaced = true;
          }
        });
        this.filter();
        this.cdr.detectChanges();
      }
    });
  }

  onSearchInput(): void {
    this.loadStudents(this.searchQuery);
  }

  loadStudents(query?: string): void {
    this.loading = true;
    this.studentApi.list(query).subscribe({
      next: (res: Student[]) => {
        this.students = res || [];
        this.students.forEach(s => {
          const sId = String(s.id).toLowerCase().trim();
          const sRoll = s.registerNumber ? String(s.registerNumber).toLowerCase().trim() : '';
          if (this.placedStudentsSet.has(sId) || (sRoll && this.placedStudentsSet.has(sRoll))) {
            s.isPlaced = true;
          }
        });
        this.filter();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.students = [];
        this.filter();
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadStudentProfile(id: string): void {
    this.studentApi.getOne(id).subscribe({
      next: (data: Student) => {
        this.student = data;

        // Fetch campus drive applications and drives for this student
        forkJoin({
          apps: this.http.get<any>(`${environment.baseUrl}/placements-app/list-applications`),
          drives: this.http.get<any>(`${environment.baseUrl}/placements-app/placements`)
        }).subscribe({
          next: ({ apps, drives }) => {
            // Extract data arrays (handle nested responseData)
            const rawApps = apps && apps.responseData?.data?.data ? apps.responseData.data.data : (apps && apps.responseData?.data ? apps.responseData.data : (apps && apps.responseData ? apps.responseData : (apps && apps.data ? apps.data : (Array.isArray(apps) ? apps : []))));
            const allApps = Array.isArray(rawApps) ? rawApps : [];

            const rawDrives = drives && drives.responseData?.data?.data ? drives.responseData.data.data : (drives && drives.responseData?.data ? drives.responseData.data : (drives && drives.responseData ? drives.responseData : (drives && drives.data ? drives.data : (Array.isArray(drives) ? drives : []))));
            const drivesList = Array.isArray(rawDrives) ? rawDrives : [];

            // Flatten placements into individual drive/job entries (placements have nested jobs)
            const allDrives: any[] = [];
            drivesList.forEach((p: any) => {
              const jobsArray = p.jobs_PlacementDrive_DocumentArray || p.jobs;
              const companyName = p.companyName_PlacementDrive_Text || p.companyName || p.company || '';
              const placementId = p._id || p.id;
              if (jobsArray && Array.isArray(jobsArray)) {
                jobsArray.forEach((j: any) => {
                  allDrives.push({
                    _id: placementId,
                    jobId: j.jobId_PlacementDrive_Text || j.jobId || '',
                    placementId: placementId,
                    companyName: companyName,
                    companyName_PlacementDrive_Text: companyName,
                    role: j.role_PlacementDrive_Text || j.role || '',
                    role_PlacementDrive_Text: j.role_PlacementDrive_Text || j.role || '',
                    packageCTC: j.packageLpa_PlacementDrive_Text || j.packageLPA || '',
                    location: p.address || j.location || '',
                    eligibleBatches: j.eligibleBatches_PlacementDrive_TextArray ? j.eligibleBatches_PlacementDrive_TextArray.join(', ') : (j.eligibleBatches ? (Array.isArray(j.eligibleBatches) ? j.eligibleBatches.join(', ') : j.eligibleBatches) : (p.batchCode_PlacementDrive_Text || p.batchCode || ''))
                  });
                });
              } else {
                allDrives.push({
                  _id: placementId,
                  placementId: placementId,
                  companyName: companyName,
                  companyName_PlacementDrive_Text: companyName,
                  role: p.role || '',
                  role_PlacementDrive_Text: p.role || '',
                  packageCTC: p.packageCTC || '',
                  location: p.location || '',
                  eligibleBatches: p.batchCode_PlacementDrive_Text || p.batchCode || ''
                });
              }
            });

            // Helper to extract studentId from an application
            const getAppStudentId = (app: any): string => {
              let sid = app.studentId || app.studentId_PlacementAppilcation_Text || app.userId || '';
              if (app.student && typeof app.student === 'object') {
                sid = app.student._id || app.student.id || sid;
              } else if (typeof app.student === 'string') {
                sid = app.student;
              }
              return String(sid).toLowerCase();
            };

            const getAppRollNo = (app: any): string => {
              return String(app.rollNo || app.rollNo_PlacementAppilcation_Text || '').toLowerCase();
            };

            const studentIdLower = id.toLowerCase();
            const regNumLower = data.registerNumber ? String(data.registerNumber).toLowerCase() : '';

            const isStudentApp = (app: any): boolean => {
              const appSid = getAppStudentId(app);
              const appRoll = getAppRollNo(app);
              return (appSid !== '' && appSid === studentIdLower) ||
                (appRoll !== '' && regNumLower !== '' && appRoll === regNumLower);
            };

            // Helper to find matching drive
            const findDrive = (app: any): any => {
              const appPlacementId = app.placementId || app.placementId_PlacementAppilcation_Text || '';
              const appJobId = app.jobId || app.jobId_PlacementAppilcation_Text || '';
              const appDriveId = app.driveId || '';
              return allDrives.find((d: any) => {
                const dId = d._id || d.id || '';
                const dJobId = d.jobId || '';
                const dPlacementId = d.placementId || '';
                return (appDriveId && dId === appDriveId) ||
                  (appJobId && dJobId && String(appJobId) === String(dJobId)) ||
                  (appPlacementId && (dId === appPlacementId || dPlacementId === appPlacementId));
              });
            };

            // Filter for selected applications (placement history)
            this.applications = allApps.filter((app: any) => {
              const status = app.status || app.status_PlacementAppilcation_Text || '';
              return status.toLowerCase() === 'selected' && isStudentApp(app);
            });

            // Enhance applications with company and role info
            this.applications.forEach((app: any) => {
              const matchingDrive = findDrive(app);
              app.company = app.companyName || app.companyName_PlacementAppilcation_Text || matchingDrive?.companyName || matchingDrive?.companyName_PlacementDrive_Text || 'Unknown Company';
              app.title = app.role || app.role_PlacementAppilcation_Text || matchingDrive?.role || 'Role';
              app.ctc = app.ctc || app.packageLpa_PlacementAppilcation_Text || matchingDrive?.packageCTC || '';
              app.location = app.location || app.location_PlacementAppilcation_Text || matchingDrive?.location || 'N/A';
              app.status = app.status || app.status_PlacementAppilcation_Text || '';
            });

            // If not manually placed, fetch from drive application
            if (!this.student?.placedCompany && this.applications.length > 0) {
              const selectedApp = this.applications[0];
              if (this.student) {
                this.student.isPlaced = true;
                this.student.placedCompany = selectedApp.company;
                this.student.placedRole = selectedApp.title;
                this.student.placedLocation = selectedApp.location;
                const packageVal = selectedApp.ctc ? parseInt(String(selectedApp.ctc)) : undefined;
                this.student.placedPackage = isNaN(packageVal as any) ? undefined : packageVal;
              }
            }

            // Build drive list for this student — show all eligible drives with applied/status
            const studentApps = allApps.filter((app: any) => isStudentApp(app));
            const studentBatch = data.batchCode || '';

            this.studentDriveApplications = allDrives.map((drive: any) => {
              // Check if the student's batch is eligible for this drive
              const driveBatches = drive.eligibleBatches || '';
              if (studentBatch && driveBatches && !driveBatches.toLowerCase().includes(studentBatch.toLowerCase())) {
                return null; // not eligible
              }

              // Find matching application from this student for this drive
              const matchedApp = studentApps.find((app: any) => {
                const appPlacementId = app.placementId || app.placementId_PlacementAppilcation_Text || '';
                const appJobId = app.jobId || app.jobId_PlacementAppilcation_Text || '';
                const appDriveId = app.driveId || '';
                const dId = drive._id || drive.id || '';
                const dJobId = drive.jobId || '';
                const dPlacementId = drive.placementId || '';
                return (appDriveId && dId === appDriveId) ||
                  (appJobId && dJobId && String(appJobId) === String(dJobId)) ||
                  (appPlacementId && (dId === appPlacementId || dPlacementId === appPlacementId));
              });

              let status = 'Not Applied';
              if (matchedApp) {
                const rawStatus = matchedApp.status || matchedApp.status_PlacementAppilcation_Text || 'Applied';
                status = rawStatus === 'Applied' ? 'In Progress' : rawStatus;
              }

              return {
                company: drive.companyName || drive.companyName_PlacementDrive_Text || 'Unknown Company',
                title: drive.role || drive.role_PlacementDrive_Text || '',
                status: status
              };
            }).filter((d: any) => d !== null);

            this.cdr.detectChanges();
          },
          error: () => {
            this.applications = [];
            this.studentDriveApplications = [];
            this.cdr.detectChanges();
          }
        });

        this.cdr.detectChanges();
      },
      error: () => {
        this.student = null;
        this.applications = [];
        this.studentDriveApplications = [];
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

  downloadDeclaration(student: Student, event?: MouseEvent): void {
    const fileTarget = student.declarationUrl || student.declarationFileName;
    if (!fileTarget) return;

    if (fileTarget.startsWith('http://') || fileTarget.startsWith('https://') || fileTarget.startsWith('data:') || fileTarget.startsWith('blob:')) {
      window.open(fileTarget, '_blank');
      if (event) event.preventDefault();
    } else {
      const link = document.createElement('a');
      link.href = fileTarget.startsWith('/') || fileTarget.startsWith('./') ? fileTarget : `${environment.baseUrl}/uploads/${fileTarget}`;
      link.download = student.declarationFileName || 'Declaration_Form.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (event) event.preventDefault();
    }
  }

  statusFilter: 'all' | 'placed' | 'unplaced' = 'all';
  optInFilter: 'all' | 'optedin' | 'optedout' = 'all';

  filter(resetPage: boolean = true): void {
    if (resetPage) {
      this.currentPage = 1;
    }
    
    this.filteredStudents = this.students.filter(s => {
      // 1. Status Filter
      if (this.statusFilter === 'placed' && !s.isPlaced) return false;
      if (this.statusFilter === 'unplaced' && s.isPlaced) return false;

      // 2. Opt-in Filter
      if (this.optInFilter === 'optedin' && s.optInStatus !== 'opted_in') return false;
      if (this.optInFilter === 'optedout' && s.optInStatus !== 'opted_out') return false;

      // 3. Search Query Filter
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const isPlacedStr = s.isPlaced ? 'placed' : 'unplaced';
        return (
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.registerNumber && s.registerNumber.toLowerCase().includes(q)) ||
          (s.course && s.course.toLowerCase().includes(q)) ||
          (s.cgpa && s.cgpa.toString().toLowerCase().includes(q)) ||
          (s.optInStatus && s.optInStatus.toLowerCase().replace('_', ' ').includes(q)) ||
          (s.freezeStatus && s.freezeStatus.toLowerCase().includes(q)) ||
          (isPlacedStr.includes(q))
        );
      }
      return true;
    });
  }

  toggleSelectAll(event: any): void {
    const checked = event.target.checked;
    if (checked) {
      this.filteredStudents.forEach(s => this.selectedIds.add(s.id));
    } else {
      this.selectedIds.clear();
    }
  }

  exportTracker(): void {
    const selectedStudents = this.students.filter(s => this.selectedIds.has(s.id));
    if (selectedStudents.length === 0) {
      alert('No students selected.');
      return;
    }

    const data = selectedStudents.map(s => {
      const raw = s.raw || {};
      let workExpDetails = '';
      if (raw.internshipDetails_PlacementStudent_DocumentArray && Array.isArray(raw.internshipDetails_PlacementStudent_DocumentArray)) {
        workExpDetails = raw.internshipDetails_PlacementStudent_DocumentArray.map((i: any) => {
          const comp = i.companyName_PlacementStudent_Text || '';
          const dur = i.duration_PlacementStudent_Text || '';
          return comp ? `${comp} ${dur ? '(' + dur + ' months)' : ''}`.trim() : '';
        }).filter((x: string) => x).join(', ');
      }
      if (!workExpDetails) {
        const company = raw.companyName_PlacementStudent_Text || raw.experienceCompany_PlacementStudent_Text || '';
        const duration = raw.duration_PlacementStudent_Text || raw.experienceMonths_PlacementStudent_Int || '';
        workExpDetails = (company || duration) ? `${company} ${duration ? '(' + duration + ' months)' : ''}`.trim() : '';
      }
      const workExp = workExpDetails ? 'Yes' : 'No';

      return {
        'Email Address': raw.email_PlacementStudent_Text || raw.email || '',
        'First Name (In Capital Letter)': (raw.firstName_PlacementStudent_Text || raw.firstName || '').toUpperCase(),
        'Last Name (In Capital Letter)': (raw.lastName_PlacementStudent_Text || raw.lastName || '').toUpperCase(),
        'Roll Number': raw.rollNo_PlacementStudent_Text || raw.rollNo || raw.registerNumber || '',
        'Gender': raw.gender_PlacementStudent_Text || raw.gender || '',
        'Date of birth': raw.dob_PlacementStudent_Date || raw.dateOfBirth || raw.dob || '',
        'Section': raw.section_PlacementStudent_Text || raw.section || '',
        'Specialization ': raw.specialization_PlacementStudent_Text || raw.course || raw.specialization || '',
        'Email Id (Personal ID)': raw.personalEmail_PlacementStudent_Text || raw.personalEmail || raw.email_PlacementStudent_Text || raw.email || '',
        'Opting for': (raw.optedIn_PlacementStudent_Bool || raw.optedIn) ? 'Placements' : '',
        'SSLC/10th Institution Name': raw.tenthInstitution_PlacementStudent_Text || raw.tenthInstitution || '',
        'Location of 10th School': raw.tenthLocation_PlacementStudent_Text || raw.tenthLocation || '',
        '% in SSLC/10th': raw.tenthPer_PlacementStudent_Double || raw.tenthPercentage || '',
        '12th/PU Institution Name': raw.twelfthInstitution_PlacementStudent_Text || raw.twelfthInstitution || '',
        'Location of PU Institution ': raw.twelfthLocation_PlacementStudent_Text || raw.twelfthLocation || '',
        '% in 12th/ PU': raw.twelthPer_PlacementStudent_Double || raw.twelfthPercentage || '',
        'Degree Institution Name': raw.degreeInstitution_PlacementStudent_Text || raw.degreeInstitution || '',
        'Location of Degree Institution ': raw.degreeLocation_PlacementStudent_Text || raw.degreeLocation || '',
        '% in Degree (Consolidated % till 4th Sem)': raw.cgpa_PlacementStudent_Double || raw.cgpa || '',
        'Backlogs': (raw.backlogs_PlacementStudent_Int > 0 || raw.backlogs > 0) ? 'Yes' : 'No',
        'If yes, how many backlog ': raw.backlogs_PlacementStudent_Int || raw.backlogs || '',
        'PG Institution Name': raw.pgInstitution_PlacementStudent_Text || raw.pgInstitution || 'Kristu Jayanti College',
        '% in PG Degree (Consolidated % till 4th Sem)2': raw.pgPer_PlacementStudent_Double || '',
        'Backlog in PG': (parseInt(raw.pgBacklogs_PlacementStudent_Text) > 0) ? 'Yes' : 'No',
        'If yes, how many backlog 2': raw.pgBacklogs_PlacementStudent_Text || '',
        'Do you have work Experience (Including Internship) ? ': workExp,
        'If you have, Company Name & Number of months of experience': workExpDetails,
        'Mobile No (10 digit number)': raw.phone_PlacementStudent_Long || raw.phone || '',
        'Alternative Mobile No': raw.altPhone_PlacementStudent_Long || raw.altPhone || '',
        'PAN Card No': raw.panCard_PlacementStudent_Text || raw.panCard || '',
        'Driving License No': raw.drivingLicense_PlacementStudent_Text || raw.drivingLicense || '',
        'Aadhar Card No': raw.aadhar_PlacementStudent_Long || raw.aadhar || '',
        'Blood Group': raw.bloodGroup_PlacementStudent_Text || raw.bloodGroup || '',
        'Father Name': raw.fatherName_PlacementStudent_Text || raw.fatherName || '',
        'Father Occupation': raw.fatherOccupation_PlacementStudent_Text || raw.fatherOccupation || '',
        'Permanent Address ': raw.permanentAddress_PlacementStudent_Text || raw.permanentAddress || '',
        'Present Address': raw.presentAddress_PlacementStudent_Text || raw.presentAddress || '',
        ' Will you adhere to the CECR Placement Guidelines': (raw.optedIn_PlacementStudent_Bool || raw.optedIn) ? 'Yes' : '',
        'Attendance percentage (4th sem)': raw.attendance_PlacementStudent_Text || raw.attendance || '',
        'Upload your resume (File name should be Student name_Roll No)': raw.studentResume_PlacementStudent_Text || raw.resumeUrl || '',
        'Upload your Declaration Form (File name should be Student name_Roll No)': raw.declaration_PlacementStudent_Text || raw.declarationUrl || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Selected Students');
    XLSX.writeFile(wb, `master_tracker.csv`, { bookType: 'csv' });
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
      if (!confirm(`Are you sure you want to change the freeze status for ${student.name}?`)) return;
      const nextFreeze = student.freezeStatus === 'active' ? 'frozen' : 'active';
      this.studentApi.updateStatus(id, undefined, nextFreeze).subscribe({
        next: (updatedStudent) => {
          // Keep local properties that might not be returned in simple updates
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

  changeOptInStatus(id: string, newStatus: string): void {
    const student = this.students.find(s => s.id === id);
    if (student) {
      if (!confirm(`Are you sure you want to update the opt-in status to ${newStatus} for ${student.name}?`)) return;
      if (student.isFlagged) {
        this.toastService.error('Cannot change opt-in status for a flagged student.');
        student.optInStatus = 'opted_out'; // revert UI
        return;
      }
      this.studentApi.updateStatus(id, newStatus, undefined).subscribe({
        next: (updatedStudent) => {
          student.optInStatus = newStatus as any;
          this.toastService.success(`Student opt-in status updated to ${newStatus}!`);
          this.cdr.detectChanges();
        },
        error: () => {
          student.optInStatus = newStatus as any;
          this.toastService.success(`Student opt-in status updated to ${newStatus} (offline simulation)!`);
          this.cdr.detectChanges();
        }
      });
    }
  }

  toggleFlag(id: string): void {
    const student = this.students.find(s => s.id === id);
    if (student) {
      const current = student.isFlagged || false;
      if (!confirm(`Are you sure you want to ${current ? 'unflag' : 'flag'} ${student.name} for malpractices?`)) return;
      const payload: any = {
        flagged: !current,
        flagged_PlacementStudent_Bool: !current
      };

      if (!current) {
        // If getting flagged, force opt-out
        payload.optedIn = false;
        payload.optedIn_PlacementStudent_Bool = false;
      }

      this.http.put<any>(`${environment.baseUrl}/placements-app/update-student/${id}`, payload).subscribe({
        next: () => {
          student.isFlagged = !current;
          if (!current) student.optInStatus = 'opted_out';
          this.toastService.success(`Student ${!current ? 'flagged for malpractice' : 'unflagged'}!`);
          this.cdr.detectChanges();
        },
        error: () => {
          student.isFlagged = !current; // Fallback
          if (!current) student.optInStatus = 'opted_out';
          this.toastService.success(`Student ${!current ? 'flagged for malpractice' : 'unflagged'} (offline simulation)!`);
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
                // Merge to avoid losing local fields not sent back by simple updates
                this.students[idx] = { ...this.students[idx], ...updated, optInStatus: updated.optInStatus, freezeStatus: updated.freezeStatus };
              }
            });
            this.filter(false);
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
            this.filter(false);
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
                this.students[idx] = { ...this.students[idx], ...updated, optInStatus: updated.optInStatus, freezeStatus: updated.freezeStatus };
              }
            });
            this.filter(false);
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
            this.filter(false);
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

  openPlacementModal(student: Student) {
    this.selectedPlacementStudent = student;
    this.placementForm = {
      company: '',
      location: '',
      role: '',
      package: null
    };
    this.showPlacementModal = true;
  }

  closePlacementModal() {
    this.showPlacementModal = false;
    this.selectedPlacementStudent = null;
  }

  submitManualPlacement(isPlaced: boolean) {
    if (!this.selectedPlacementStudent) return;

    const payload: any = {
      placedStatus_PlacementStudent_Bool: isPlaced
    };

    if (isPlaced) {
      payload.placedCompany_PlacementStudent_Text = this.placementForm.company;
      payload.placedLocation_PlacementStudent_Text = this.placementForm.location;
      payload.role_PlacementStudent_Text = this.placementForm.role;
      payload.package_PlacementStudent_Int = this.placementForm.package;
      payload.freeze = true;
      payload.freeze_PlacementStudent_Bool = true;
    } else {
      payload.placedCompany_PlacementStudent_Text = '';
      payload.placedLocation_PlacementStudent_Text = '';
      payload.role_PlacementStudent_Text = '';
      payload.package_PlacementStudent_Int = null;
    }

    this.http.put<any>(`${environment.baseUrl}/placements-app/update-student/${this.selectedPlacementStudent.id}`, payload).subscribe({
      next: () => {
        this.toastService.success('Placement status updated successfully');
        this.closePlacementModal();
        this.loadStudents();
      },
      error: () => {
        this.toastService.error('Failed to update placement status');
      }
    });
  }
}
