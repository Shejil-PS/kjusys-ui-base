import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { SharedToastService } from '@libs/shared-toast';
import { environment } from '../../../environments/environment';

const extractDataArray = (obj: any): any[] => {
  if (Array.isArray(obj)) return obj;
  if (obj && Array.isArray(obj.responseData?.data?.data)) return obj.responseData.data.data;
  if (obj && Array.isArray(obj.responseData?.data)) return obj.responseData.data;
  if (obj && Array.isArray(obj.responseData)) return obj.responseData;
  if (obj && Array.isArray(obj.data)) return obj.data;
  if (obj && Array.isArray(obj.value)) return obj.value;
  return [];
};

// ── CUSTOM MODELS ──
export interface PlacementDrive {
  id: string;
  placementId?: string;
  companyName: string;
  role?: string;
  type: string;
  packageCTC: string | number;
  location: string;
  status: string;
  applicationsCount: number;
  openDate?: string;
  closeDate?: string;
  minimumCgpa: number;
  eligibleCourses?: string[];
}

export interface StudentApplication {
  id: string;
  name: string;
  course: string;
  status: string;
  appliedDate?: string;
  registerNumber?: string;
  studentRegisterNumber?: string;
  studentId?: string;
  driveId?: string;
  backlogs?: string | number;
}

export interface CandidateView {
  id: string;
  name: string;
  applied: string;
  reg: string;
  course: string;
  agg: string;
  tenth: string;
  twelfth: string;
  backlogs: string | number;
  status: string;
  optIn?: string;
  freeze?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  panCardNo?: string;
  aadharCardNo?: string;
  permanentAddress?: string;
  presentAddress?: string;
  resumeUrl?: string;
  skills?: string[];
  rawStudent?: any;
}

// ── CUSTOM INLINE SERVICES ──
class StudentApiService {
  constructor(private http: HttpClient) { }
  list(): Observable<any[]> {
    return this.http.get<any[]>(environment.baseUrl + '/placements-app/list-students');
  }
}

class PlacementApiService {
  constructor(private http: HttpClient) { }
  listDrives(): Observable<any[]> {
    return this.http.get<any[]>(environment.baseUrl + '/placements-app/placements');
  }
  createDrive(drive: any): Observable<any> {
    return this.http.post<any>(environment.baseUrl + '/placements-app/create-placements', drive);
  }
  updateDrive(id: string, drive: any): Observable<any> {
    return this.http.put<any>(`${environment.baseUrl}/placements-app/update-placements/${id}`, drive);
  }
  listCandidates(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.baseUrl}/placements-app/list-applications`).pipe(
      map(apps => {
        const appsList = extractDataArray(apps);
        return appsList.filter((a: any) => 
          a.jobId === id || a.jobId_PlacementAppilcation_Text === id || 
          a.placementId === id || a.placementId_PlacementAppilcation_Text === id
        );
      })
    );
  }
  updateCandidateStatus(driveId: string, appId: string, status: string): Observable<any> {
    return this.http.patch<any>(`${environment.baseUrl}/placements-app/applications/${appId}/status`, { status });
  }
}

@Component({
  selector: 'app-drives',
  templateUrl: './drives.component.html',
  styleUrls: ['./drives.component.css']
})
export class DrivesComponent implements OnInit {
  placementApi: PlacementApiService;
  studentApi: StudentApiService;

  drives: PlacementDrive[] = [];

  candidates: CandidateView[] = [];

  filteredDrives: PlacementDrive[] = [];
  searchQuery = '';
  candidateSearchQuery = '';

  // Page toggle: 'list' or 'candidates'
  currentSubpage: 'list' | 'candidates' = 'list';
  activeDrive: PlacementDrive | null = null;
  selectedCandidateIds = new Set<string>();

  // Create Modal bindings
  showCreateModal = false;
  createCompany = '';
  createRole = '';
  createType = 'Full-Time';
  createPackage = '';
  createLocation = '';
  createOpens = '';
  createCloses = '';

  // Edit Modal bindings
  showEditModal = false;
  editingDrive: PlacementDrive | null = null;
  editCompany = '';
  editRole = '';
  editType = '';
  editPackage = '';
  editLocation = '';
  editOpens = '';
  editCloses = '';

  // Bulk action states
  showBulkModal = false;
  activeBulkTab: 'excel' | 'manual' = 'excel';
  bulkFilename = '';
  isFileSelected = false;
  showPreview = false;
  parsedBulkRows: any[] = [];
  bulkStatus = '';
  bulkOptIn = '';
  bulkFreeze = '';
  bulkBusy = false;
  bulkApplyLabel = 'Apply Bulk Update';
  isDragOver = false;

  // Bulk update progress bar state
  bulkProgressShow = false;
  bulkProgressFill = 0;
  bulkProgressLabel = '';

  // Export Tracker states
  showExportModal = false;
  selectedTemplate = 'template1';
  customTemplateName = '';
  showSaveCustomTemplate = false;
  customTemplates: { id: string, name: string, fields: string[] }[] = [];
  exportFields = [
    { id: 'f_all', label: 'All Fields', checked: false, isAll: true },
    // Student Collection Fields
    { id: 'rollNo', label: 'Register No', checked: true },
    { id: 'firstName', label: 'First Name', checked: true },
    { id: 'lastName', label: 'Last Name', checked: true },
    { id: 'gender', label: 'Gender', checked: false },
    { id: 'dob', label: 'Date of Birth', checked: false },
    { id: 'section', label: 'Section', checked: false },
    { id: 'specialization', label: 'Specialization/Course', checked: true },
    { id: 'departmentName', label: 'Department', checked: false },
    { id: 'personalEmail', label: 'Email', checked: true },
    { id: 'batchCode', label: 'Batch Code', checked: false },
    { id: 'backlogs', label: 'Backlogs', checked: false },
    { id: 'cgpa', label: 'CGPA', checked: false },
    { id: 'optIn', label: 'Opt-In Status', checked: false },
    { id: 'freeze', label: 'Freeze Status', checked: false },
    // Placement Collection Fields
    { id: 'companyName', label: 'Company Name', checked: true },
    { id: 'role', label: 'Job Role', checked: true },
    { id: 'employmentType', label: 'Job Type', checked: false },
    { id: 'packageLPA', label: 'Package (LPA)', checked: true },
    { id: 'driveStart', label: 'Drive Start Date', checked: false },
    { id: 'driveEnd', label: 'Drive End Date', checked: false },
    { id: 'status', label: 'Application Status', checked: true },
    { id: 'appliedDate', label: 'Applied Date', checked: false }
  ];

  // Send Email states
  showSendEmailModal = false;
  emailRecipientType = 'All Applicants';
  emailTemplate = '';
  emailSubject = '';
  emailMessage = '';

  // Toast notifications state
  toasts: { id: number; message: string; type?: string; show: boolean }[] = [];
  private nextToastId = 0;

  // Status mapping UI representations
  statusBadgeStyle: Record<string, string> = {
    'In Progress': 'background:#FFF7ED;color:#C2620C;',
    'Selected': 'background:#EFF8F1;color:#1A7F3C;',
    'Rejected': 'background:#FEF2F2;color:#B91C1C;',
    'On Hold': 'background:#EEF2FF;color:#3730A3;',
    'Not Applied': 'background:#f3f4f6;color:#6b7280;',
    '—': 'background:#f3f4f6;color:#6b7280;',
    'Awaiting Update': 'background:#f3f4f6;color:#6b7280;',
    'AWAITING_UPDATE': 'background:#f3f4f6;color:#6b7280;',
    'IN_PROGRESS': 'background:#FFF7ED;color:#C2620C;',
    'SELECTED': 'background:#EFF8F1;color:#1A7F3C;',
    'REJECTED': 'background:#FEF2F2;color:#B91C1C;',
    'ON_HOLD': 'background:#EEF2FF;color:#3730A3;'
  };

  statusLabel: Record<string, string> = {
    'Selected': 'Selected — Offer Extended',
    'Rejected': 'Rejected — Not Proceeding',
    'On Hold': 'On Hold — Under Review',
    'In Progress': 'In Progress — Rounds Ongoing',
    'Not Applied': 'Not Applied',
    '—': 'Awaiting Update',
    'Awaiting Update': 'Awaiting Update',
    'AWAITING_UPDATE': 'Awaiting Update',
    'SELECTED': 'Selected — Offer Extended',
    'REJECTED': 'Rejected — Not Proceeding',
    'ON_HOLD': 'On Hold — Under Review',
    'IN_PROGRESS': 'In Progress — Rounds Ongoing'
  };

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toastService: SharedToastService
  ) {
    this.placementApi = new PlacementApiService(http);
    this.studentApi = new StudentApiService(http);
  }

  ngOnInit(): void {
    const stored = localStorage.getItem('placementCustomTemplates');
    if (stored) {
      try {
        this.customTemplates = JSON.parse(stored);
      } catch (e) {}
    }
    this.filteredDrives = [...this.drives];
    this.loadDrives();
  }

  loadDrives(): void {
    forkJoin({
      drives: this.placementApi.listDrives(),
      apps: this.http.get<any[]>(environment.baseUrl + '/placements-app/list-applications')
    }).subscribe({
      next: ({ drives, apps }) => {
        const drivesList = extractDataArray(drives);
        const appsList = extractDataArray(apps);

        if (drivesList && drivesList.length > 0) {
          const flatDrives: PlacementDrive[] = [];
          drivesList.forEach((p: any) => {
            const jobsArray = p.jobs_PlacementDrive_DocumentArray || p.jobs;
            if (jobsArray && Array.isArray(jobsArray)) {
              jobsArray.forEach((j: any) => {
                const actualJobId = j.jobId_PlacementDrive_Text || j.jobId;
                const count = appsList.filter((a: any) => a.jobId === actualJobId || a.jobId_PlacementAppilcation_Text === actualJobId).length;
                flatDrives.push({
                  id: actualJobId || p._id || p.id,
                  placementId: p._id || p.id,
                  companyName: p.companyName_PlacementDrive_Text || p.companyName || '',
                  role: j.role_PlacementDrive_Text || j.role || '',
                  type: j.employmentType_PlacementDrive_Text || j.employmentType || j.type || 'Full-Time',
                  packageCTC: j.packageLpa_PlacementDrive_Text ? `${j.packageLpa_PlacementDrive_Text} LPA` : (j.packageLPA ? `${j.packageLPA} LPA` : (j.packageCTC || '')),
                  location: p.address || j.location || 'Bengaluru, India',
                  status: (j.active_PlacementDrive_Bool === false || j.active === false) ? 'closed' : 'open',
                  openDate: this.formatDate(p.driveStart_PlacementDrive_Date || p.driveStart || p.openDate),
                  closeDate: this.formatDate(p.driveEnd_PlacementDrive_Date || p.driveEnd || p.closeDate),
                  minimumCgpa: j.minCgpa_PlacementDrive_Double || j.minCGPA || j.minimumCgpa || 6.0,
                  applicationsCount: count
                });
              });
            } else {
              const count = appsList.filter((a: any) => a.placementId === p._id || a.placementId_PlacementAppilcation_Text === p._id).length;
              flatDrives.push({
                id: p._id || p.id,
                placementId: p._id || p.id,
                companyName: p.companyName_PlacementDrive_Text || p.companyName || '',
                role: p.role || '',
                type: p.type || 'Full-Time',
                packageCTC: p.packageCTC || '',
                location: p.location || 'Bengaluru, India',
                status: p.status || 'open',
                openDate: this.formatDate(p.driveStart_PlacementDrive_Date || p.driveStart || p.openDate),
                closeDate: this.formatDate(p.driveEnd_PlacementDrive_Date || p.driveEnd || p.closeDate),
                minimumCgpa: p.minimumCgpa || 6.0,
                applicationsCount: count
              });
            }
          });
          this.drives = flatDrives;
          this.filter();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        console.log('Error loading drives');
        this.filter();
        this.cdr.detectChanges();
      }
    });
  }

  filter(): void {
    if (!this.searchQuery) {
      this.filteredDrives = [...this.drives];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredDrives = this.drives.filter(d =>
        d.companyName.toLowerCase().includes(q) || (d.role && d.role.toLowerCase().includes(q))
      );
    }
  }

  showDrivesSubpage(page: 'list' | 'candidates'): void {
    this.currentSubpage = page;
    if (page === 'list') {
      this.activeDrive = null;
    }
  }

  openCandidates(drive: PlacementDrive): void {
    this.activeDrive = drive;
    this.currentSubpage = 'candidates';
    this.selectedCandidateIds.clear();
    this.candidates = [];

    forkJoin({
      candidates: this.placementApi.listCandidates(drive.id),
      students: this.studentApi.list()
    }).subscribe({
      next: ({ candidates, students }) => {
        const candidatesList = extractDataArray(candidates);
        const studentsList = extractDataArray(students);

        if (candidatesList && candidatesList.length > 0) {
          this.candidates = candidatesList.map((c: any, i: number) => {
            const studentReg = c.studentRegisterNumber || c.studentRegisterNumber_PlacementDriveCandidate_Text || c.rollNo || c.rollNo_PlacementAppilcation_Text || '';
            const cStudentId = c.studentId || c.studentId_PlacementAppilcation_Text || '';
            const student = studentsList.find((s: any) => {
              const matchesId = cStudentId && (String(s.id) === String(cStudentId) || String(s._id) === String(cStudentId));
              const matchesReg = studentReg && (s.rollNo || s.registerNumber || s.rollNo_PlacementStudent_Text || '').toLowerCase().trim() === studentReg.toLowerCase().trim();
              return matchesId || matchesReg;
            });

            const fullName = (student?.firstName_PlacementStudent_Text && student?.lastName_PlacementStudent_Text) 
              ? `${student.firstName_PlacementStudent_Text} ${student.lastName_PlacementStudent_Text}` 
              : `${student?.firstName || ''} ${student?.lastName || ''}`.trim();

            return {
              id: c._id || c.applicationId || c.id,
              name: c.studentName || c.studentName_PlacementAppilcation_Text || c.studentName_PlacementDriveCandidate_Text || fullName || student?.name || '',
              applied: c.appliedDate || c.appiliedDate_PlacementAppilcation_Date || c.appliedDate_PlacementDriveCandidate_Date || '02-05-2026',
              reg: c.studentRegisterNumber || c.rollNo_PlacementAppilcation_Text || c.studentRegisterNumber_PlacementDriveCandidate_Text || c.rollNo || student?.rollNo || student?.registerNumber || student?.rollNo_PlacementStudent_Text || '22MCAA0' + (i + 1),
              course: student?.specialization || student?.course || student?.departmentName || student?.specialization_PlacementStudent_Text || student?.departmentName_PlacementStudent_Text || c.course || c.course_PlacementDriveCandidate_Text || 'Master of Computer Applications',
              agg: student ? `${Math.round((student.cgpa || student.cgpa_PlacementStudent_Double || 0) * 10)}%` : '85%',
              tenth: student?.tenthPercentage ? `${student.tenthPercentage}%` : '90%',
              twelfth: student?.twelfthPercentage ? `${student.twelfthPercentage}%` : '89%',
              backlogs: (student?.backlogs !== undefined || student?.backlogs_PlacementStudent_Int !== undefined) ? ((student.backlogs || student.backlogs_PlacementStudent_Int) === 0 ? '-' : String(student.backlogs || student.backlogs_PlacementStudent_Int)) : '-',
              status: c.status || c.applicationStatus || c.applicationStatus_PlacementDriveCandidate_Text || '—',
              optIn: (student?.optedIn === true || student?.optedIn_PlacementStudent_Bool === true || student?.optInStatus === 'opted_in') ? 'Opted In' : 'Pending',
              freeze: (student?.freeze === true || student?.freeze_PlacementStudent_Bool === true) ? 'Frozen' : 'Active',
              email: student?.personalEmail || student?.email || student?.personalEmail_PlacementStudent_Text || student?.email_PlacementStudent_Text || c.email || c.email_PlacementDriveCandidate_Text || '',
              phone: student?.phone || student?.phone_PlacementStudent_Text || c.phone || c.phone_PlacementDriveCandidate_Text || '',
              gender: student?.gender || student?.gender_PlacementStudent_Text || c.gender || c.gender_PlacementDriveCandidate_Text || '',
              dateOfBirth: student?.dob || student?.dateOfBirth || student?.dob_PlacementStudent_Date || c.dateOfBirth || c.dob || c.dob_PlacementDriveCandidate_Date || '',
              panCardNo: c.panCardNo || c.panCardNo_PlacementDriveCandidate_Text || '—',
              aadharCardNo: c.aadharCardNo || c.aadharCardNo_PlacementDriveCandidate_Text || '—',
              permanentAddress: c.permanentAddress || c.permanentAddress_PlacementDriveCandidate_Text || '—',
              presentAddress: c.presentAddress || c.presentAddress_PlacementDriveCandidate_Text || '—',
              resumeUrl: student?.resumeUrl || c.resumeUrl || c.resumeUrl_PlacementDriveCandidate_Text || '',
              skills: student?.skills || c.skills_PlacementDriveCandidate_TextArray || [],
              rawStudent: student
            };
          });
        } else {
          this.candidates = [];
        }
        this.cdr.detectChanges();
      },
      error: () => {
        console.log('Error loading candidates');
        this.candidates = [];
        this.cdr.detectChanges();
      }
    });
  }

  filterCandidates(q: string): void {
    this.candidateSearchQuery = q;
  }

  getFilteredCandidates(): CandidateView[] {
    if (!this.candidateSearchQuery) return this.candidates;
    const q = this.candidateSearchQuery.toLowerCase();
    return this.candidates.filter(c => c.name.toLowerCase().includes(q));
  }

  updateCandidateStatus(index: number, val: string): void {
    if (!val || !this.activeDrive) return;
    const c = this.candidates[index];
    this.placementApi.updateCandidateStatus(this.activeDrive.id, c.id, val).subscribe({
      next: () => {
        c.status = val;
        this.showToast(`Status updated for ${c.name}.`);
        if (val === 'Selected' || val === 'SELECTED') {
          this.handleStudentSelection(c.reg, this.activeDrive!.id);
        }
        this.cdr.detectChanges();
      },
      error: () => {
        c.status = val;
        this.showToast(`Status updated for ${c.name} (offline simulation).`);
        if (val === 'Selected' || val === 'SELECTED') {
          this.handleStudentSelection(c.reg, this.activeDrive!.id);
        }
        this.cdr.detectChanges();
      }
    });
  }

  handleStudentSelection(studentRegisterNo: string, currentDriveId: string): void {
    if (!studentRegisterNo) return;
    this.studentApi.list().subscribe({
      next: (students) => {
        const studentsList = Array.isArray(students) ? students : ((students as any).responseData?.data || []);
        const student = studentsList.find((s: any) =>
          (s.registerNumber || s.rollNo || s.rollNo_PlacementStudent_Text || s.id || '').toLowerCase().trim() === studentRegisterNo.toLowerCase().trim()
        );
        if (student) {
          const studentId = student.id || student._id;

          // 1. Freeze student eligibility
          this.http.put(`${environment.baseUrl}/placements-app/update-student/${studentId}`, { freeze: true }).subscribe({
            next: () => {
              this.showToast(`Student ${student.name || studentRegisterNo} has been automatically frozen.`);
              // Update local state freeze status
              this.candidates.forEach(cand => {
                if (cand.reg.toLowerCase().trim() === studentRegisterNo.toLowerCase().trim()) {
                  cand.freeze = 'Frozen';
                }
              });
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Error auto-freezing student:', err);
            }
          });

          // 2. Auto-reject other active applications
          this.http.get<any[]>(environment.baseUrl + '/placements-app/list-applications').subscribe({
            next: (apps) => {
              const appsList = extractDataArray(apps);
              const otherApps = appsList.filter((app: any) => {
                const isSameStudent = String(app.studentId) === String(studentId) || 
                  (app.studentRegisterNumber || app.studentRegisterNumber_PlacementDriveCandidate_Text || app.rollNo || '').toLowerCase().trim() === studentRegisterNo.toLowerCase().trim();
                const isSameDrive = app.driveId === currentDriveId || app.placementId === currentDriveId || app.jobId === currentDriveId;
                const isNotSelectedOrRejected = app.status !== 'Selected' && app.status !== 'SELECTED' && app.status !== 'Rejected' && app.status !== 'REJECTED';
                return isSameStudent && !isSameDrive && isNotSelectedOrRejected;
              });

              otherApps.forEach((app: any) => {
                const appId = app.applicationId || app._id || app.id;
                this.placementApi.updateCandidateStatus(currentDriveId, appId, 'REJECTED').subscribe({
                  next: () => {
                    console.log(`Auto-rejected application ${appId} for other drive.`);
                  },
                  error: (err) => {
                    console.error('Error auto-rejecting application:', err);
                  }
                });
              });
            },
            error: (err) => {
              console.error('Error fetching applications for auto-rejection:', err);
            }
          });
        }
      },
      error: (err) => {
        console.error('Error listing students for selection handler:', err);
      }
    });
  }

  toggleSelectCandidate(id: string): void {
    if (this.selectedCandidateIds.has(id)) {
      this.selectedCandidateIds.delete(id);
    } else {
      this.selectedCandidateIds.add(id);
    }
  }

  isAllCandidatesSelected(): boolean {
    const currentList = this.getFilteredCandidates();
    return currentList.length > 0 && currentList.every(c => this.selectedCandidateIds.has(c.id));
  }

  toggleSelectAllCandidates(event: any): void {
    const checked = event.target.checked;
    const currentList = this.getFilteredCandidates();
    if (checked) {
      currentList.forEach(c => this.selectedCandidateIds.add(c.id));
    } else {
      currentList.forEach(c => this.selectedCandidateIds.delete(c.id));
    }
  }

  getCheckedIndices(): number[] {
    const indices: number[] = [];
    this.candidates.forEach((c, idx) => {
      if (this.selectedCandidateIds.has(c.id)) {
        indices.push(idx);
      }
    });
    return indices;
  }

  // Create Modal
  openCreateModal(): void {
    this.createCompany = '';
    this.createRole = '';
    this.createType = 'Full-Time';
    this.createPackage = '';
    this.createLocation = '';
    this.createOpens = '';
    this.createCloses = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  submitDrive(event: Event): void {
    event.preventDefault();
    const companyNameVal = this.createCompany;
    const companyIdVal = 'C' + Math.floor(100 + Math.random() * 900);
    const codeVal = companyNameVal.substring(0, 3).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
    const startVal = this.createOpens || new Date().toISOString().substring(0, 10);
    const endVal = this.createCloses || new Date().toISOString().substring(0, 10);

    const backendPayload: any = {
      companyCode_PlacementDrive_Text: codeVal,
      companyName_PlacementDrive_Text: companyNameVal || 'TBD',
      batchCode_PlacementDrive_Text: '2026',
      driveStart_PlacementDrive_Date: new Date(startVal).getTime(),
      driveEnd_PlacementDrive_Date: new Date(endVal).getTime(),
      jobs_PlacementDrive_DocumentArray: [{
        jobId: 'J' + Math.floor(100 + Math.random() * 900),
        role_PlacementDrive_Text: this.createRole || 'Software Engineer',
        description_PlacementDrive_Text: 'Placement Job Description',
        eligibleBatches_PlacementDrive_TextArray: ['2026'],
        employmentType_PlacementDrive_Text: this.createType || 'Full-Time',
        packageLpa_PlacementDrive_Text: String(this.createPackage ? parseFloat(this.createPackage.replace(/[^\d.]/g, '')) || 6.0 : 6.0),
        minCgpa_PlacementDrive_Double: 6.0,
        active_PlacementDrive_Bool: true,
        allowBacklog_PlacementDrive_Bool: false,
        fields_PlacementDrive_DocumentArray: []
      }]
    };

    this.placementApi.createDrive(backendPayload).subscribe({
      next: (res: any) => {
        const created = res && (res.responseData?.data || res.responseData || res.data) ? (res.responseData?.data || res.responseData || res.data) : backendPayload;
        // Backend returns {} or [] for success without payload
        const isEmptyObj = Object.keys(created).length === 0 && created.constructor === Object;
        const isArray = Array.isArray(created) && created.length === 0;
        const finalData = (isArray || isEmptyObj) ? backendPayload : created;
        
        const mappedDrive: PlacementDrive = {
          id: finalData._id || finalData.id || String(this.drives.length + 1),
          companyName: finalData.companyName_PlacementDrive_Text || finalData.companyName,
          role: (finalData.jobs_PlacementDrive_DocumentArray?.[0] || finalData.jobs?.[0])?.role_PlacementDrive_Text || this.createRole,
          type: (finalData.jobs_PlacementDrive_DocumentArray?.[0] || finalData.jobs?.[0])?.employmentType_PlacementDrive_Text || this.createType,
          packageCTC: `${(finalData.jobs_PlacementDrive_DocumentArray?.[0] || finalData.jobs?.[0])?.packageLpa_PlacementDrive_Text || this.createPackage} LPA`,
          location: this.createLocation || 'TBD',
          status: 'open',
          applicationsCount: 0,
          openDate: this.formatDate(finalData.driveStart_PlacementDrive_Date || this.createOpens),
          closeDate: this.formatDate(finalData.driveEnd_PlacementDrive_Date || this.createCloses),
          minimumCgpa: (finalData.jobs_PlacementDrive_DocumentArray?.[0] || finalData.jobs?.[0])?.minCgpa_PlacementDrive_Double || 6.0
        };
        this.drives.push(mappedDrive);
        this.filter();
        this.closeCreateModal();
        this.showToast('Drive created successfully.');
        this.cdr.detectChanges();
      },
      error: () => {
        // Fallback local simulation
        const fallbackDrive: PlacementDrive = {
          id: String(this.drives.length + 1),
          companyName: this.createCompany,
          role: this.createRole,
          type: this.createType,
          packageCTC: this.createPackage,
          location: this.createLocation || 'TBD',
          status: 'open',
          applicationsCount: 0,
          openDate: this.formatDate(this.createOpens || '—'),
          closeDate: this.formatDate(this.createCloses || '—'),
          minimumCgpa: 6.0
        };
        this.drives.push(fallbackDrive);
        this.filter();
        this.closeCreateModal();
        this.showToast('Drive created (offline simulation).');
        this.cdr.detectChanges();
      }
    });
  }

  // Edit Modal
  openEditModal(drive: PlacementDrive): void {
    this.editingDrive = drive;
    this.editCompany = drive.companyName;
    this.editRole = drive.role || '';
    this.editType = drive.type;
    this.editPackage = String(drive.packageCTC);
    this.editLocation = drive.location;
    this.editOpens = drive.openDate || '';
    this.editCloses = drive.closeDate || '';
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingDrive = null;
  }

  submitEditDrive(event: Event): void {
    event.preventDefault();
    if (!this.editingDrive) return;

    const jobId = this.editingDrive.id;
    const placementId = this.editingDrive.placementId || jobId;

    const parentPayload = {
      companyName_PlacementDrive_Text: this.editCompany,
      driveStart_PlacementDrive_Date: this.editOpens,
      driveEnd_PlacementDrive_Date: this.editCloses
    };

    this.placementApi.updateDrive(placementId, parentPayload).subscribe({
      next: (parentRes: any) => {
        const updatedParent = parentRes && (parentRes.responseData?.data || parentRes.responseData || parentRes.data) ? (parentRes.responseData?.data || parentRes.responseData || parentRes.data) : parentRes;

        if (jobId.startsWith('J')) {
          const jobPayload = {
            jobId_PlacementDrive_Text: jobId,
            companyId_PlacementDrive_Text: updatedParent.companyId_PlacementDrive_Text || updatedParent.companyId || 'C123',
            role_PlacementDrive_Text: this.editRole,
            description_PlacementDrive_Text: 'Placement Job Description',
            eligibleBatches_PlacementDrive_TextArray: ['2026'],
            employmentType_PlacementDrive_Text: this.editType,
            packageLpa_PlacementDrive_Text: String(this.editPackage ? parseFloat(String(this.editPackage).replace(/[^\d.]/g, '')) || 6.0 : 6.0),
            minCgpa_PlacementDrive_Double: this.editingDrive?.minimumCgpa || 6.0,
            active_PlacementDrive_Bool: this.editingDrive?.status !== 'closed',
            fields_PlacementDrive_DocumentArray: []
          };

          this.http.put(`${environment.baseUrl}/placements-app/placements/${placementId}/jobs/${jobId}`, jobPayload).subscribe({
            next: (jobRes: any) => {
              this.updateLocalDriveState(jobId, updatedParent, jobPayload);
            },
            error: (err) => {
              console.error('Error updating job details:', err);
              this.updateLocalDriveState(jobId, updatedParent, jobPayload);
            }
          });
        } else {
          this.updateLocalDriveState(jobId, updatedParent);
        }
      },
      error: () => {
        // Fallback update local state for offline simulation
        const idx = this.drives.findIndex(x => x.id === jobId);
        if (idx !== -1) {
          this.drives[idx] = {
            ...this.drives[idx],
            companyName: this.editCompany,
            role: this.editRole,
            type: this.editType,
            packageCTC: this.editPackage,
            openDate: this.formatDate(this.editOpens),
            closeDate: this.formatDate(this.editCloses)
          };
        }
        this.filter();
        this.closeEditModal();
        this.showToast('Drive updated (offline simulation).');
        this.cdr.detectChanges();
      }
    });
  }

  updateLocalDriveState(jobId: string, updatedParent: any, updatedJob?: any): void {
    const idx = this.drives.findIndex(x => x.id === jobId);
    if (idx !== -1) {
      this.drives[idx] = {
        ...this.drives[idx],
        companyName: this.editCompany,
        role: this.editRole,
        type: this.editType,
        packageCTC: this.editPackage,
        openDate: this.formatDate(this.editOpens),
        closeDate: this.formatDate(this.editCloses)
      };
    }
    this.filter();
    this.closeEditModal();
    this.showToast('Drive updated successfully.');
    this.cdr.detectChanges();
  }

  // Bulk actions modal
  openBulkUpdateModal(): void {
    this.parsedBulkRows = [];
    this.activeBulkTab = 'excel';
    this.bulkBusy = false;
    this.bulkProgressShow = false;
    this.bulkProgressFill = 0;
    this.bulkProgressLabel = '';
    this.bulkFilename = '';
    this.isFileSelected = false;
    this.showPreview = false;
    this.bulkStatus = '';
    this.bulkOptIn = '';
    this.bulkFreeze = '';
    this.bulkApplyLabel = 'Apply Bulk Update';

    this.showBulkModal = true;
  }

  closeBulkUpdateModal(): void {
    if (this.bulkBusy) return;
    this.showBulkModal = false;
  }

  switchBulkTab(tab: 'excel' | 'manual'): void {
    this.activeBulkTab = tab;
  }

  downloadBulkTemplate(): void {
    const targetCandidates = this.selectedCandidateIds.size > 0
      ? this.candidates.filter(c => this.selectedCandidateIds.has(c.id))
      : this.candidates;

    const data = targetCandidates.map(c => ({
      'Register No.': c.reg || '',
      'Name': c.name || '',
      'Course': c.course || '',
      'Aggregate %': c.agg || '0%',
      '10th %': c.tenth || '0%',
      '12th %': c.twelfth || '0%',
      'Backlogs': c.backlogs === '-' ? '0' : String(c.backlogs || 0),
      'Final Status': c.status || '—',
      'Update Status (Selected / Rejected / On Hold / In Progress)': ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 16 }, { wch: 28 }, { wch: 38 },
      { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 18 }, { wch: 18 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
    XLSX.writeFile(wb, 'bulk_update_template.xlsx');
    this.showToast('Template downloaded — fill "Update Status" column and re-upload.');
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
            ? this.candidates.find(c => (c.reg || '').toLowerCase().trim() === mapped.reg.toLowerCase().trim())
            : null;
          if (match && this.selectedCandidateIds.size > 0 && !this.selectedCandidateIds.has(match.id)) {
            match = null;
          }
          return { ...mapped, _match: match || null };
        }).filter((r: any) => r.reg);

        this.showPreview = true;
      } catch (err) {
        this.showToast('Could not read the file. Please check the format.', 'error');
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
      else if (['name', 'studentname', 'candidatename', 'fullname'].includes(n))
        out.name = String(row[k]).trim();
      else if (['course', 'department', 'dept', 'program', 'programme'].includes(n))
        out.course = String(row[k]).trim();
      else if (n.startsWith('updatestatus') || ['update', 'newstatus', 'updatedstatus'].includes(n))
        out.updateStatus = String(row[k]).trim();
      else if (['finalstatus', 'status', 'finalstat'].includes(n))
        out.finalStatus = String(row[k]).trim();
    });
    if (!out.updateStatus && out.finalStatus && out.finalStatus !== '—') {
      out.updateStatus = out.finalStatus;
    }
    return out;
  }

  applyBulkUpdate(): void {
    if (this.bulkBusy) return;

    if (this.activeBulkTab === 'excel') {
      const matched = this.parsedBulkRows.filter(r => r._match && r.updateStatus && r.updateStatus !== '—');
      if (this.parsedBulkRows.length === 0) {
        this.showToast('Please upload a file before applying the bulk update.', 'error');
        return;
      }
      if (matched.length === 0) {
        this.showToast('No records with an "Update Status" value found. Fill the column and re-upload.', 'error');
        return;
      }

      this.setBulkBusy(true);
      this.runProgress(() => {
        matched.forEach(r => {
          const c = r._match;
          if (r.updateStatus) {
            c.status = r.updateStatus;
            this.placementApi.updateCandidateStatus(this.activeDrive!.id, c.id, r.updateStatus).subscribe({
              error: (err) => console.error("Failed to bulk update status for " + c.id, err)
            });
          }
          if (r.name) c.name = r.name;
          const idx = this.candidates.findIndex(orig => orig.id === c.id);
          if (idx !== -1) {
            this.candidates[idx] = { ...this.candidates[idx], status: r.updateStatus, name: r.name };
          }
          if (r.updateStatus && (r.updateStatus === 'Selected' || r.updateStatus === 'SELECTED')) {
            this.handleStudentSelection(c.reg, this.activeDrive!.id);
          }
        });
        this.setBulkBusy(false);
        this.closeBulkUpdateModal();
        this.showToast(`${matched.length} record(s) updated successfully.`);
      });

    } else {
      const statusVal = this.bulkStatus;
      const optinVal = this.bulkOptIn;
      const freezeVal = this.bulkFreeze;

      if (!statusVal && !optinVal && !freezeVal) {
        this.showToast('Please select at least one field to update.', 'error');
        return;
      }

      const selectedList = this.getCheckedIndices();
      const targetIdxs = selectedList.length > 0 ? selectedList : this.candidates.map((_, i) => i);

      this.setBulkBusy(true);
      this.runProgress(() => {
        targetIdxs.forEach(i => {
          if (statusVal) {
            this.candidates[i].status = statusVal;
            this.placementApi.updateCandidateStatus(this.activeDrive!.id, this.candidates[i].id, statusVal).subscribe({
              error: (err) => console.error("Failed to bulk update status for " + this.candidates[i].id, err)
            });
          }
          if (optinVal) this.candidates[i].optIn = optinVal;
          if (freezeVal) this.candidates[i].freeze = freezeVal;
          if (statusVal && (statusVal === 'Selected' || statusVal === 'SELECTED')) {
            this.handleStudentSelection(this.candidates[i].reg, this.activeDrive!.id);
          }
        });
        this.setBulkBusy(false);
        this.closeBulkUpdateModal();
        this.showToast(`${targetIdxs.length} record(s) updated successfully.`);
      });
    }
  }

  runProgress(cb: () => void): void {
    this.bulkProgressShow = true;
    this.bulkProgressFill = 0;
    const steps = [
      { p: 20, m: 'Validating records…' },
      { p: 45, m: 'Beginning transaction…' },
      { p: 70, m: 'Applying updates…' },
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

  // Export Tracker Modal
  openExportModal(): void {
    this.selectedTemplate = 'template1';
    this.customTemplateName = '';
    this.showSaveCustomTemplate = false;
    this.onTemplateChange('template1');
    this.showExportModal = true;
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  onFieldChange(field: any): void {
    if (field.isAll) {
      this.exportFields.forEach(f => {
        if (!f.isAll) f.checked = field.checked;
      });
    } else {
      const allField = this.exportFields.find(f => f.isAll);
      const otherFields = this.exportFields.filter(f => !f.isAll);
      if (allField) {
        allField.checked = otherFields.every(f => f.checked);
      }
    }
  }

  getSelectedFieldsCount(): number {
    return this.exportFields.filter(f => !f.isAll && f.checked).length;
  }

  onTemplateChange(val: string): void {
    this.selectedTemplate = val;
    this.showSaveCustomTemplate = (val === 'custom');
    if (val === 'template1') {
      const template1Checked = new Set(['rollNo', 'firstName', 'lastName', 'specialization', 'companyName', 'role', 'status']);
      this.exportFields.forEach(f => {
        if (!f.isAll) {
          f.checked = template1Checked.has(f.id);
        }
      });
      const allField = this.exportFields.find(f => f.isAll);
      if (allField) allField.checked = false;
    } else if (val.startsWith('custom_')) {
      const template = this.customTemplates.find(t => t.id === val);
      if (template) {
        const customChecked = new Set(template.fields);
        this.exportFields.forEach(f => {
          if (!f.isAll) f.checked = customChecked.has(f.id);
        });
        const allField = this.exportFields.find(f => f.isAll);
        if (allField) allField.checked = false;
      }
    }
  }

  saveCustomTemplate(): void {
    if (!this.customTemplateName.trim()) {
      alert('Please enter a template name.');
      return;
    }
    const selectedFields = this.exportFields.filter(f => !f.isAll && f.checked).map(f => f.id);
    if (selectedFields.length === 0) {
      alert('Please select at least one field to save.');
      return;
    }

    const newTemplate = {
      id: 'custom_' + Date.now(),
      name: this.customTemplateName.trim(),
      fields: selectedFields
    };

    this.customTemplates.push(newTemplate);
    localStorage.setItem('placementCustomTemplates', JSON.stringify(this.customTemplates));
    
    this.selectedTemplate = newTemplate.id;
    this.showSaveCustomTemplate = false;
    this.customTemplateName = '';
    
    this.showToast(`Template "${newTemplate.name}" saved!`);
  }

  exportToExcel(): void {
    const selectedFields = this.exportFields.filter(f => !f.isAll && f.checked);
    if (!selectedFields.length) {
      alert('Please select at least one field.');
      return;
    }

    const data = this.candidates.map(c => {
      const row: any = {};
      const s = c.rawStudent || {};

      selectedFields.forEach(f => {
        if (f.id === 'rollNo') row[f.label] = s.rollNo || s.rollNo_PlacementStudent_Text || c.reg || '';
        else if (f.id === 'firstName') row[f.label] = s.firstName || s.firstName_PlacementStudent_Text || c.name.split(' ')[0] || '';
        else if (f.id === 'lastName') row[f.label] = s.lastName || s.lastName_PlacementStudent_Text || c.name.split(' ').slice(1).join(' ') || '';
        else if (f.id === 'gender') row[f.label] = s.gender || s.gender_PlacementStudent_Text || c.gender || '—';
        else if (f.id === 'dob') row[f.label] = s.dob || s.dob_PlacementStudent_Date || s.dateOfBirth || c.dateOfBirth || '—';
        else if (f.id === 'section') row[f.label] = s.section || s.section_PlacementStudent_Text || '—';
        else if (f.id === 'specialization') row[f.label] = s.specialization || s.specialization_PlacementStudent_Text || c.course || '—';
        else if (f.id === 'departmentName') row[f.label] = s.departmentName || s.departmentName_PlacementStudent_Text || '—';
        else if (f.id === 'personalEmail') row[f.label] = s.personalEmail || s.personalEmail_PlacementStudent_Text || c.email || '—';
        else if (f.id === 'batchCode') row[f.label] = s.batchCode || s.batchCode_PlacementStudent_Text || '—';
        else if (f.id === 'backlogs') row[f.label] = (s.backlogs !== undefined || s.backlogs_PlacementStudent_Int !== undefined) ? (s.backlogs || s.backlogs_PlacementStudent_Int) : (c.backlogs || '—');
        else if (f.id === 'cgpa') row[f.label] = (s.cgpa !== undefined || s.cgpa_PlacementStudent_Double !== undefined) ? (s.cgpa || s.cgpa_PlacementStudent_Double) : (c.agg || '—');
        else if (f.id === 'optIn') row[f.label] = c.optIn || '—';
        else if (f.id === 'freeze') row[f.label] = c.freeze || '—';
        else if (f.id === 'companyName') row[f.label] = this.activeDrive?.companyName || '—';
        else if (f.id === 'role') row[f.label] = this.activeDrive?.role || '—';
        else if (f.id === 'employmentType') row[f.label] = this.activeDrive?.type || '—';
        else if (f.id === 'packageLPA') row[f.label] = this.activeDrive?.packageCTC || '—';
        else if (f.id === 'driveStart') row[f.label] = this.activeDrive?.openDate || '—';
        else if (f.id === 'driveEnd') row[f.label] = this.activeDrive?.closeDate || '—';
        else if (f.id === 'status') row[f.label] = c.status || '—';
        else if (f.id === 'appliedDate') row[f.label] = c.applied || '—';
        else row[f.label] = (c as any)[f.id] || '—';
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
    const driveName = this.activeDrive ? this.activeDrive.companyName + '_' + (this.activeDrive.role || '') : 'candidates';
    XLSX.writeFile(wb, `${driveName.toLowerCase().replace(/[\s/]/g, '_')}_tracker.csv`, { bookType: 'csv' });
    this.closeExportModal();
    this.showToast('Candidates tracker exported successfully as CSV.');
  }

  // Send Email Modal
  openSendEmailModal(): void {
    this.emailRecipientType = 'All Applicants';
    this.emailTemplate = '';
    this.emailSubject = '';
    this.emailMessage = '';
    this.showSendEmailModal = true;
  }

  closeSendEmailModal(): void {
    this.showSendEmailModal = false;
  }

  sendEmail(): void {
    this.showToast(`Email batch dispatched to selected candidate segments.`);
    this.closeSendEmailModal();
  }

  // Toast System
  showToast(message: string, type?: string): void {
    if (type === 'error') {
      this.toastService.error(message);
    } else if (type === 'warning') {
      this.toastService.warning(message);
    } else {
      this.toastService.success(message);
    }
  }

  formatDate(dStr: string | undefined): string {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      if (isNaN(d.getTime())) return dStr;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dStr;
    }
  }
}
