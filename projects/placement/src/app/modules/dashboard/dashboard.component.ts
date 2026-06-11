import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

// ── BATCH MODEL & DASHBOARD STATS ──
export interface DashboardStats {
  optedInStudents: number;
  drivesThisYear: number;
  totalPlaced: number;
  placementRate: string;
  companies: number;
}

// ── CUSTOM INLINE SERVICE APIS ──
class StudentApiService {
  constructor(private http: HttpClient) {}
  list(): Observable<any[]> {
    return this.http.get<any[]>(environment.baseUrl + '/placements-app/list-students');
  }
}

class CompanyApiService {
  constructor(private http: HttpClient) {}
  list(): Observable<any[]> {
    return this.http.get<any[]>(environment.baseUrl + '/placements-app/list-comnpanies');
  }
}

class PlacementApiService {
  constructor(private http: HttpClient) {}
  listDrives(): Observable<any[]> {
    return this.http.get<any[]>(environment.baseUrl + '/placements-app/placements');
  }
  createDrive(drive: any): Observable<any> {
    return this.http.post<any>(environment.baseUrl + '/placements-app/create-placements', drive);
  }
}

class BatchApiService {
  constructor(private http: HttpClient) {}
  getSummary(): Observable<any[]> {
    return this.http.get<any[]>(environment.baseUrl + '/placements-app/list-batches');
  }
}

// ── STAT CARD COMPONENT ──
@Component({
  selector: 'app-card',
  template: `
    <div [class]="'stat-card ' + variant">
      <div class="stat-icon" [ngClass]="iconClass">
        <ng-content select="[card-icon]"></ng-content>
      </div>
      <div class="stat-label">{{ title }}</div>
      <div class="stat-value">
        {{ value }}
        <span *ngIf="subtitle" class="stat-sub">{{ subtitle }}</span>
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      position: relative;
      overflow: hidden;
      background: #ffffff;
      border: 1px solid #f0f0f0;
      border-radius: 12px;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      width: 100%;
      height: 160px;
      box-sizing: border-box;
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      border-radius: 12px 12px 0 0;
    }
    .stat-card.blue::before { background: #155DFC; }
    .stat-card.purple::before { background: #9810FA; }
    .stat-card.orange::before { background: #F54900; }
    .stat-card.green::before { background: #00A63E; }
    .stat-card.teal::before { background: #00AAFF; }
    .stat-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
      margin-top: 4px;
    }
    .bg-blue-50 { background-color: #eff6ff !important; }
    .bg-purple-50 { background-color: #f5f3ff !important; }
    .bg-orange-50 { background-color: #fff7ed !important; }
    .bg-green-50 { background-color: #ecfdf5 !important; }
    .bg-sky-50 { background-color: #f0f9ff !important; }
    .stat-label {
      font-size: 12px;
      color: #9ca3af;
      letter-spacing: 0.05em;
      font-weight: 500;
    }
    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      display: flex;
      align-items: baseline;
      gap: 4px;
      flex-wrap: wrap;
    }
    .stat-sub {
      font-size: 12px;
      font-weight: 400;
      color: #9ca3af;
    }
  `]
})
export class CardComponent {
  @Input() title = '';
  @Input() value: string | number | null = '';
  @Input() subtitle = '';
  @Input() variant: 'blue' | 'purple' | 'orange' | 'green' | 'teal' = 'blue';
  @Input() iconClass = '';
}

// ── MAIN DASHBOARD COMPONENT ──
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  studentApi: StudentApiService;
  companyApi: CompanyApiService;
  placementApi: PlacementApiService;
  batchApi: BatchApiService;

  academicYears: string[] = ['2022–2023', '2023–2024', '2024–2025', '2025–2026'];
  selectedAcademicYear = '2024–2025';

  allStudents: any[] = [];
  allCompanies: any[] = [];
  allDrives: any[] = [];
  allApplications: any[] = [];

  chartPoints: any[] = [];
  chartLinePath = '';
  chartAreaPath = '';
  chartYLabels: number[] = [220, 165, 110, 55, 0];

  stats: DashboardStats = {
    optedInStudents: 0,
    drivesThisYear: 0,
    totalPlaced: 0,
    placementRate: '0%',
    companies: 0
  };

  recentDrives: any[] = [];

  topRecruiters: any[] = [];

  schools: any[] = [];

  // ── REPORTS STATE ──
  reportsOpen = false;
  reportsTab: 'std' | 'custom' = 'std';
  reportTemplateName = '';
  selectedStandardReport: string = 'placed';
  selectedStandardFieldsCount = 0;
  selectedCustomFieldsCount = 0;

  standardReportFields = [
    { key: 'placed', label: 'Placed Students', checked: false, category: 'Placement' },
    { key: 'rejected', label: 'Rejected Applications', checked: false, category: 'Placement' },
    { key: 'offers', label: 'Drive Details & Offers', checked: false, category: 'Placement' },
    { key: 'rate', label: 'Placement Rate by Dept', checked: false, category: 'Placement' },
    { key: 'companies', label: 'Company Directory', checked: false, category: 'Companies' },
    { key: 'visits', label: 'Company Visits & Drives', checked: false, category: 'Companies' },
    { key: 'placements', label: 'Placement Rate by Company', checked: false, category: 'Companies' },
    { key: 'selections', label: 'Company Selections & Students', checked: false, category: 'Companies' }
  ];

  customReportFields = [
    { key: 'name', label: 'Name', checked: false, category: 'Student Profile Fields' },
    { key: 'registerNumber', label: 'Register', checked: false, category: 'Student Profile Fields' },
    { key: 'course', label: 'Course', checked: false, category: 'Student Profile Fields' },
    { key: 'cgpa', label: 'CGPA', checked: false, category: 'Student Profile Fields' }
  ];

  // ── RECRUITMENT WIZARD STATE ──
  wizardOpen = false;
  step = 1;
  cid = 1;

  COMPANY_MASTER: any[] = [];
  INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Consulting', 'E-commerce', 'Manufacturing', 'Media', 'Education', 'Other'];
  JOB_TYPES = ['Full-Time', 'Internship', 'Part-Time', 'Contract'];
  BATCH_MASTER: any[] = [];

  companies: Array<{ id: number; masterId: string; name: string; industry: string }> = [];
  jobs: { [key: number]: Array<{ role: string; type: string; desc: string; ctc: string; minAgg: number | null; backlogAllowed: boolean; _open: boolean }> } = {};
  batchDates: {
    [key: string]: {
      batches: string[];
      openDate: string;
      closeDate: string;
      requiresDataCollection?: boolean;
      questions?: Array<{ label: string; type: string; required: boolean }>;
    }
  } = {};

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toastService: SharedToastService
  ) {
    this.studentApi = new StudentApiService(http);
    this.companyApi = new CompanyApiService(http);
    this.placementApi = new PlacementApiService(http);
    this.batchApi = new BatchApiService(http);
  }

  ngOnInit(): void {
    this.loadStats();
    this.loadRecentDrives();
    this.loadBatches();
  }

  loadRecentDrives(): void {
    this.placementApi.listDrives().subscribe({
      next: (res: any) => {
        const drives = extractDataArray(res);
        if (drives && drives.length > 0) {
          const flatDrives: any[] = [];
          drives.forEach((p: any) => {
            const jobsArray = p.jobs || p.jobs_PlacementDrive_DocumentArray;
            if (jobsArray && Array.isArray(jobsArray)) {
              jobsArray.forEach((j: any) => {
                flatDrives.push({
                  id: j.jobId || j.jobId_PlacementDrive_Text || p._id || p.id,
                  companyName: p.companyName || p.companyName_PlacementDrive_Text || '',
                  role: j.role || j.role_PlacementDrive_Text || '',
                  type: j.employmentType || j.employmentType_PlacementDrive_Text || j.type || 'Full-Time',
                  packageCTC: j.packageLpa_PlacementDrive_Text ? `${j.packageLpa_PlacementDrive_Text} LPA` : (j.packageLPA ? `${j.packageLPA} LPA` : (j.packageCTC || '')),
                  location: p.address || j.location || 'Bengaluru, India',
                  status: j.active === false || j.active_PlacementDrive_Bool === false ? 'Intake Closed' : 'Intake Open',
                  statusClass: j.active === false || j.active_PlacementDrive_Bool === false ? 'badge-closed' : 'badge-open',
                  openDate: p.driveStart_PlacementDrive_Date ? this.formatDate(p.driveStart_PlacementDrive_Date) : (p.driveStart ? this.formatDate(p.driveStart) : (p.openDate ? this.formatDate(p.openDate) : '')),
                  closeDate: p.driveEnd_PlacementDrive_Date ? this.formatDate(p.driveEnd_PlacementDrive_Date) : (p.driveEnd ? this.formatDate(p.driveEnd) : (p.closeDate ? this.formatDate(p.closeDate) : '')),
                  minimumCgpa: j.minCGPA || j.minCgpa_PlacementDrive_Double || j.minimumCgpa || 6.0,
                  eligibleCourses: j.eligibleBatches_PlacementDrive_TextArray || j.eligibleCourses || ['B.Tech CSE', 'M.Tech CSE', 'MCA']
                });
              });
            } else {
              const statusLower = String(p.status).toLowerCase();
              const isOpen = statusLower === 'open' || statusLower === 'ongoing' || statusLower === 'upcoming' || statusLower === 'intake open';
              flatDrives.push({
                id: p._id || p.id,
                companyName: p.companyName || p.companyName_PlacementDrive_Text || '',
                role: p.role || '',
                type: p.type || 'Full-Time',
                packageCTC: p.packageCTC || '',
                location: p.location || 'Bengaluru, India',
                status: isOpen ? 'Intake Open' : 'Intake Closed',
                statusClass: isOpen ? 'badge-open' : 'badge-closed',
                openDate: p.driveStart_PlacementDrive_Date ? this.formatDate(p.driveStart_PlacementDrive_Date) : (p.openDate ? this.formatDate(p.openDate) : ''),
                closeDate: p.driveEnd_PlacementDrive_Date ? this.formatDate(p.driveEnd_PlacementDrive_Date) : (p.closeDate ? this.formatDate(p.closeDate) : ''),
                minimumCgpa: p.minimumCgpa || 6.0,
                eligibleCourses: p.eligibleCourses || ['B.Tech CSE', 'M.Tech CSE', 'MCA']
              });
            }
          });
          this.recentDrives = flatDrives;
        } else {
          this.recentDrives = [];
        }
        this.cdr.detectChanges();
      },
      error: () => {
        console.log('Error loading drives');
        this.recentDrives = [];
        this.cdr.detectChanges();
      }
    });
  }

  loadBatches(): void {
    this.batchApi.getSummary().subscribe({
      next: (rawRes: any) => {
        const res = extractDataArray(rawRes);
        if (res && res.length) {
          this.BATCH_MASTER = res.map((b: any) => ({
            id: b.batchCode_PlacementBatches_Text || b.batchCode || b.batchId || b._id,
            label: b.batchCode_PlacementBatches_Text || b.batchCode || b.batchName_PlacementBatches_Text || b.batchName
          }));
        } else {
          this.BATCH_MASTER = [];
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.BATCH_MASTER = [];
        this.cdr.detectChanges();
      }
    });
  }

  loadStats(): void {
    forkJoin({
      students: this.studentApi.list(),
      companies: this.companyApi.list(),
      drives: this.placementApi.listDrives(),
      applications: this.http.get<any[]>(environment.baseUrl + '/placements-app/list-applications')
    }).subscribe({
      next: ({ students, companies, drives, applications }) => {
        this.allStudents = extractDataArray(students);
        this.allCompanies = extractDataArray(companies);
        this.allDrives = extractDataArray(drives);
        this.allApplications = extractDataArray(applications);
        
        if (this.allCompanies && this.allCompanies.length > 0) {
          this.COMPANY_MASTER = this.allCompanies.map(c => ({ id: c.companyCode_PlacementCompany_Text || c._id || c.id || c.COMPANY_CODE || c.name, name: c.COMPANY_NAME || c.companyName_PlacementCompany_Text || c.companyName || c.name || '', industry: c.INDUSTRY || c.industry_PlacementCompany_Text || c.industry || '' }));
        }
        this.calculateStats();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading stats', err);
        this.allApplications = [];
        this.COMPANY_MASTER = [];
        this.calculateStats();
        this.cdr.detectChanges();
      }
    });
  }

  calculateStats(): void {
    const targetYearPrefix = this.selectedAcademicYear.substring(2, 4); // e.g. "24" for "2024–2025"

    // Filter students belonging to this academic year batch
    const students = this.allStudents.filter(s => {
      const code = s.batchCode || s.batchCode_PlacementStudent_Text || '';
      const match = code.match(/^\d{2}/);
      if (match) return match[0] === targetYearPrefix;
      const reg = s.rollNo || s.registerNumber || s.rollNo_PlacementStudent_Text || '';
      const matchReg = reg.match(/^\d{2}/);
      if (matchReg) return matchReg[0] === targetYearPrefix;
      return false;
    });

    // Determine placed students based on their applications status
    const placedStudentsSet = new Set<string>();
    this.allApplications.forEach((app: any) => {
      if (app.status === 'Selected' || app.status === 'SELECTED') {
        if (app.studentId) placedStudentsSet.add(String(app.studentId).toLowerCase().trim());
        if (app.rollNo) placedStudentsSet.add(String(app.rollNo).toLowerCase().trim());
        if (app.rollNo_PlacementStudent_Text) placedStudentsSet.add(String(app.rollNo_PlacementStudent_Text).toLowerCase().trim());
        if (app.studentRegisterNumber) placedStudentsSet.add(String(app.studentRegisterNumber).toLowerCase().trim());
      }
    });

    const isStudentPlaced = (s: any): boolean => {
      if (s.isPlaced === true || s.status === 'Selected') return true;
      const sId = String(s.id || s._id || '').toLowerCase().trim();
      const sRoll = String(s.registerNumber || s.rollNo || s.rollNo_PlacementStudent_Text || '').toLowerCase().trim();
      return placedStudentsSet.has(sId) || (!!sRoll && placedStudentsSet.has(sRoll));
    };

    const isStudentOptedIn = (s: any): boolean => {
      return s.optInStatus === 'opted_in' || s.optedIn === true || s.optedIn_PlacementStudent_Bool === true;
    };

    const optedIn = students.filter(s => isStudentOptedIn(s)).length;
    const placed = students.filter(s => isStudentPlaced(s)).length;
    const totalCompanies = this.allCompanies.length;
    const totalDrives = this.allDrives.length;
    const rate = optedIn > 0 ? Math.round((placed / optedIn) * 100) + '%' : '0%';

    this.stats = {
      optedInStudents: optedIn,
      drivesThisYear: totalDrives,
      totalPlaced: placed,
      placementRate: rate,
      companies: totalCompanies
    };

    const recruiterCounts: { [companyName: string]: number } = {};
    this.allApplications.forEach((app: any) => {
      if (app.status === 'SELECTED' || app.status === 'Selected') {
        const studentMatches = students.some(s => {
          const sId = String(s.id || s._id || '').toLowerCase().trim();
          const sRoll = String(s.registerNumber || s.rollNo || s.rollNo_PlacementStudent_Text || '').toLowerCase().trim();
          return sId === String(app.studentId || '').toLowerCase().trim() ||
                 sRoll === String(app.rollNo || '').toLowerCase().trim();
        });
        if (studentMatches) {
          const matchingDrive = this.allDrives.find(d => d.id === app.driveId || d._id === app.driveId);
          const company = app.companyName || matchingDrive?.companyName || 'Unknown Company';
          recruiterCounts[company] = (recruiterCounts[company] || 0) + 1;
        }
      }
    });

    const sortedRecruiters = Object.keys(recruiterCounts)
      .map((name) => ({
        name,
        count: recruiterCounts[name]
      }))
      .sort((a, b) => b.count - a.count);

    const rankStyles = [
      'bg-[#EFF6FF] text-[#2563EB]',
      'bg-[#FEF2F2] text-[#EF4444]',
      'bg-[#FFF7ED] text-[#F97316]',
      'bg-[#F1F5F9] text-[#64748B]'
    ];

    // Reset topRecruiters first in case there are none for the selected year
    if (sortedRecruiters.length > 0) {
      this.topRecruiters = sortedRecruiters.map((r, i) => ({
        name: r.name,
        count: r.count,
        class: rankStyles[i] || 'bg-gray-100 text-gray-600'
      }));
    } else {
      this.topRecruiters = [];
    }

    // Helper to map student departments to Department names and specialization/courses
    const getSchoolAndDept = (s: any) => {
      const dept = (s.departmentName || s.departmentName_PlacementStudent_Text || s.department || 'General').trim();
      const spec = (s.specialization || s.specialization_PlacementStudent_Text || s.course || 'General').trim();
      return { school: dept, department: spec };
    };

    // Initialize an empty map to group dynamically by database department name and courses
    const schoolsMap: { [schoolName: string]: { [deptName: string]: { placed: number; total: number } } } = {};

    // Aggregate student metrics dynamically
    students.forEach(s => {
      const { school, department } = getSchoolAndDept(s);
      const isPlaced = isStudentPlaced(s);
      const isOpted = isStudentOptedIn(s);

      if (isOpted) {
        if (!schoolsMap[school]) {
          schoolsMap[school] = {};
        }
        if (!schoolsMap[school][department]) {
          schoolsMap[school][department] = { placed: 0, total: 0 };
        }
        schoolsMap[school][department].total++;
        if (isPlaced) {
          schoolsMap[school][department].placed++;
        }
      }
    });

    // Map schools structure dynamically with totals and percentage rates
    this.schools = Object.keys(schoolsMap).map(schoolName => {
      let schoolPlaced = 0;
      let schoolTotal = 0;
      const depts = schoolsMap[schoolName];
      const deptsList = Object.keys(depts).map(deptName => {
        const d = depts[deptName];
        schoolPlaced += d.placed;
        schoolTotal += d.total;
        const rateVal = d.total > 0 ? Math.round((d.placed / d.total) * 100) + '%' : '0%';
        return {
          name: deptName,
          placed: d.placed,
          total: d.total,
          rate: rateVal
        };
      });

      const schoolRate = schoolTotal > 0 ? Math.round((schoolPlaced / schoolTotal) * 100) + '%' : '0%';
      return {
        name: schoolName,
        deptsCount: deptsList.length,
        placed: `${schoolPlaced} / ${schoolTotal}`,
        rate: schoolRate,
        open: false,
        depts: deptsList
      };
    });

    // Calculate Trends Graph Points and SVG Path (12-month academic span from Jul to Jun)
    const monthNames = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const monthlyHires = Array(12).fill(0);

    this.allApplications.forEach((app: any) => {
      if (app.status === 'SELECTED' || app.status === 'Selected') {
        const studentMatches = students.some(s => {
          const sId = String(s.id || s._id || '').toLowerCase().trim();
          const sRoll = String(s.registerNumber || s.rollNo || s.rollNo_PlacementStudent_Text || '').toLowerCase().trim();
          return sId === String(app.studentId || '').toLowerCase().trim() ||
                 sRoll === String(app.rollNo || '').toLowerCase().trim();
        });
        if (studentMatches && app.appliedDate) {
          const d = new Date(app.appliedDate);
          if (!isNaN(d.getTime())) {
            const m = d.getMonth(); // 0 to 11
            const idx = m >= 6 ? m - 6 : m + 6; // Map Jul to 0, Jun to 11
            if (idx >= 0 && idx < 12) {
              monthlyHires[idx]++;
            }
          }
        }
      }
    });

    let runningTotal = 0;
    const totalPlacedVal = placed || 220;
    const trendsData = monthNames.map((name, idx) => {
      if (monthlyHires.reduce((a, b) => a + b, 0) === 0) {
        // Curve coefficient simulation mapping Jul to Jun
        const coeffs = [0.01, 0.05, 0.15, 0.30, 0.50, 0.65, 0.75, 0.85, 0.92, 0.96, 0.99, 1.0];
        runningTotal = Math.round(totalPlacedVal * coeffs[idx]);
      } else {
        runningTotal += monthlyHires[idx];
      }
      return { month: name, count: runningTotal };
    });

    const maxVal = Math.max(...trendsData.map(t => t.count), 1);
    const height = 120;
    const width = 460;
    const paddingY = 20;

    const points = trendsData.map((t, idx) => {
      const x = (idx * width) / (monthNames.length - 1);
      const y = height - paddingY - (t.count / maxVal) * (height - 2 * paddingY);
      return { x, y, month: t.month, count: t.count };
    });

    this.chartPoints = points;
    this.chartLinePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    this.chartAreaPath = points.length ? `${this.chartLinePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z` : '';
    
    this.chartYLabels = [
      maxVal,
      Math.round(maxVal * 0.75),
      Math.round(maxVal * 0.50),
      Math.round(maxVal * 0.25),
      0
    ];

    // Map recent/upcoming drives from the placement drives collection dynamically
    if (this.allDrives && this.allDrives.length) {
      const flatDrives: any[] = [];
      this.allDrives.forEach(p => {
        const jobsArray = p.jobs || p.jobs_PlacementDrive_DocumentArray;
        if (jobsArray && Array.isArray(jobsArray)) {
          jobsArray.forEach((j: any) => {
            flatDrives.push({
              id: j.jobId || j.jobId_PlacementDrive_Text || p._id || p.id,
              companyName: p.companyName || p.companyName_PlacementDrive_Text || '',
              role: j.role || j.role_PlacementDrive_Text || '',
              type: j.employmentType || j.employmentType_PlacementDrive_Text || j.type || 'Full-Time',
              packageCTC: j.packageLpa_PlacementDrive_Text ? `${j.packageLpa_PlacementDrive_Text} LPA` : (j.packageLPA ? `${j.packageLPA} LPA` : (j.packageCTC || '')),
              location: p.address || j.location || 'Bengaluru, India',
              status: j.active === false || j.active_PlacementDrive_Bool === false ? 'Intake Closed' : 'Intake Open',
              statusClass: j.active === false || j.active_PlacementDrive_Bool === false ? 'badge-closed' : 'badge-open',
              openDate: p.driveStart_PlacementDrive_Date ? this.formatDate(p.driveStart_PlacementDrive_Date) : (p.driveStart ? this.formatDate(p.driveStart) : (p.openDate ? this.formatDate(p.openDate) : '')),
              closeDate: p.driveEnd_PlacementDrive_Date ? this.formatDate(p.driveEnd_PlacementDrive_Date) : (p.driveEnd ? this.formatDate(p.driveEnd) : (p.closeDate ? this.formatDate(p.closeDate) : '')),
              minimumCgpa: j.minCGPA || j.minCgpa_PlacementDrive_Double || j.minimumCgpa || 6.0,
              eligibleCourses: j.eligibleBatches_PlacementDrive_TextArray || j.eligibleCourses || ['B.Tech CSE', 'M.Tech CSE', 'MCA']
            });
          });
        } else {
          const statusLower = String(p.status).toLowerCase();
          const isOpen = statusLower === 'open' || statusLower === 'ongoing' || statusLower === 'upcoming' || statusLower === 'intake open';
          flatDrives.push({
            id: p._id || p.id,
            companyName: p.companyName || p.companyName_PlacementDrive_Text || '',
            role: p.role || '',
            type: p.type || 'Full-Time',
            packageCTC: p.packageCTC || '',
            location: p.location || 'Bengaluru, India',
            status: isOpen ? 'Intake Open' : 'Intake Closed',
            statusClass: isOpen ? 'badge-open' : 'badge-closed',
            openDate: p.driveStart_PlacementDrive_Date ? this.formatDate(p.driveStart_PlacementDrive_Date) : (p.openDate ? this.formatDate(p.openDate) : ''),
            closeDate: p.driveEnd_PlacementDrive_Date ? this.formatDate(p.driveEnd_PlacementDrive_Date) : (p.closeDate ? this.formatDate(p.closeDate) : ''),
            minimumCgpa: p.minimumCgpa || 6.0,
            eligibleCourses: p.eligibleCourses || ['B.Tech CSE', 'M.Tech CSE', 'MCA']
          });
        }
      });
      this.recentDrives = flatDrives;
    }
  }

  toggleSchool(index: number): void {
    this.schools[index].open = !this.schools[index].open;
  }

  // ── REPORTS PANEL METHODS ──
  toggleReports(): void {
    this.reportsOpen = !this.reportsOpen;
  }

  switchReportsTab(tab: 'std' | 'custom'): void {
    this.reportsTab = tab;
  }

  updateFieldsCount(): void {
    this.selectedStandardFieldsCount = this.standardReportFields.filter(f => f.checked).length;
    this.selectedCustomFieldsCount = this.customReportFields.filter(f => f.checked).length;
  }

  generateReport(): void {
    const csvRows: string[] = [];

    if (this.reportsTab === 'std') {
      const option = this.selectedStandardReport || 'placed';
      
      if (option === 'placed' || option === 'rejected') {
        const headers = ['Student Name', 'Register No', 'Course', 'Company Applied', 'Status'];
        csvRows.push(headers.map(h => `"${h}"`).join(','));

        this.allApplications.forEach((app: any) => {
          const appStatus = (app.status || '—').toLowerCase();
          const targetStatus = option === 'placed' ? 'selected' : 'rejected';
          
          if (appStatus !== targetStatus) {
            return;
          }

          const student = this.allStudents.find((s: any) =>
            String(s.id) === String(app.studentId) ||
            (s.rollNo || s.registerNumber || s.rollNo_PlacementStudent_Text || '').toLowerCase().trim() === (app.studentRegisterNumber || app.rollNo || '').toLowerCase().trim()
          );

          const name = student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() : app.studentName || '—';
          const rollNo = student ? (student.rollNo || student.registerNumber || student.rollNo_PlacementStudent_Text || '—') : (app.studentRegisterNumber || app.rollNo || '—');
          const course = student ? (student.specialization || student.course || student.departmentName || student.specialization_PlacementStudent_Text || '—') : (app.course || '—');

          const drive = this.allDrives.find((d: any) =>
            String(d.id || d._id) === String(app.driveId || app.placementId)
          );
          const company = app.companyName || drive?.companyName || drive?.companyName_PlacementDrive_Text || '—';

          csvRows.push(`"${name}","${rollNo}","${course}","${company}","${app.status || '—'}"`);
        });

      } else if (option === 'offers') {
        const headers = ['Company Name', 'Job Role', 'Job Type', 'Package', 'Eligible Batches', 'Min CGPA', 'Open Date', 'Close Date'];
        csvRows.push(headers.map(h => `"${h}"`).join(','));

        this.allDrives.forEach((d: any) => {
          const compName = d.companyName || d.companyName_PlacementDrive_Text || '—';
          const openDate = d.driveStart_PlacementDrive_Date || d.driveStart || d.openDate;
          const closeDate = d.driveEnd_PlacementDrive_Date || d.driveEnd || d.closeDate;

          const jobsArray = d.jobs || d.jobs_PlacementDrive_DocumentArray;
          if (jobsArray && Array.isArray(jobsArray)) {
            jobsArray.forEach((j: any) => {
              const role = j.role || j.role_PlacementDrive_Text || '—';
              const type = j.employmentType || j.employmentType_PlacementDrive_Text || j.type || '—';
              const pkg = j.packageLpa_PlacementDrive_Text ? j.packageLpa_PlacementDrive_Text + ' LPA' : (j.packageLPA ? j.packageLPA + ' LPA' : (j.packageCTC || '—'));
              const batchesArr = j.eligibleBatches_PlacementDrive_TextArray || j.eligibleBatches || d.batchCode || [];
              const batches = Array.isArray(batchesArr) ? batchesArr.join(', ') : batchesArr;
              const minCGPA = j.minCgpa_PlacementDrive_Double || j.minCGPA || j.minimumCgpa || '—';

              csvRows.push(`"${compName}","${role}","${type}","${pkg}","${batches}","${minCGPA}","${this.formatDate(openDate)}","${this.formatDate(closeDate)}"`);
            });
          } else {
            csvRows.push(`"${compName}","${d.role || '—'}","${d.type || '—'}","${d.packageCTC || '—'}","${d.batchCode || '—'}","${d.minimumCgpa || '—'}","${this.formatDate(openDate)}","${this.formatDate(closeDate)}"`);
          }
        });

      } else if (option === 'rate') {
        const headers = ['School', 'Department', 'Total Opted-In', 'Placed Students', 'Placement Rate'];
        csvRows.push(headers.map(h => `"${h}"`).join(','));

        this.schools.forEach((school: any) => {
          if (school.depts && Array.isArray(school.depts)) {
            school.depts.forEach((dept: any) => {
              csvRows.push(`"${school.name}","${dept.name}","${dept.total}","${dept.placed}","${dept.rate}"`);
            });
          }
        });

      } else if (option === 'companies') {
        const headers = ['Company ID/Code', 'Company Name', 'Industry'];
        csvRows.push(headers.map(h => `"${h}"`).join(','));

        this.allCompanies.forEach((c: any) => {
          const code = c.companyCode_PlacementCompany_Text || c.COMPANY_CODE || c._id || c.id || '—';
          const name = c.COMPANY_NAME || c.companyName_PlacementCompany_Text || c.companyName || c.name || '—';
          const ind = c.INDUSTRY || c.industry_PlacementCompany_Text || c.industry || '—';
          csvRows.push(`"${code}","${name}","${ind}"`);
        });

      } else if (option === 'visits') {
        const headers = ['Company Name', 'Industry', 'Drive Role', 'Drive Type', 'Package', 'Open Date'];
        csvRows.push(headers.map(h => `"${h}"`).join(','));

        this.allDrives.forEach((d: any) => {
          const companyName = d.companyName || d.companyName_PlacementDrive_Text || '—';
          const comp = this.allCompanies.find(c => (c.COMPANY_NAME || c.companyName_PlacementCompany_Text || c.companyName || c.name) === companyName);
          const ind = comp ? (comp.INDUSTRY || comp.industry_PlacementCompany_Text || comp.industry || '—') : '—';
          const openDate = d.driveStart_PlacementDrive_Date || d.driveStart || d.openDate;
          
          const jobsArray = d.jobs || d.jobs_PlacementDrive_DocumentArray;
          if (jobsArray && Array.isArray(jobsArray)) {
            jobsArray.forEach((j: any) => {
              const role = j.role || j.role_PlacementDrive_Text || '—';
              const type = j.employmentType || j.employmentType_PlacementDrive_Text || j.type || '—';
              const pkg = j.packageLpa_PlacementDrive_Text ? j.packageLpa_PlacementDrive_Text + ' LPA' : (j.packageLPA ? j.packageLPA + ' LPA' : (j.packageCTC || '—'));
              
              csvRows.push(`"${companyName}","${ind}","${role}","${type}","${pkg}","${this.formatDate(openDate)}"`);
            });
          } else {
            csvRows.push(`"${companyName}","${ind}","${d.role || '—'}","${d.type || '—'}","${d.packageCTC || '—'}","${this.formatDate(openDate)}"`);
          }
        });

      } else if (option === 'placements') {
        const headers = ['Company Name', 'Total Applied', 'Total Selected', 'Selection Rate'];
        csvRows.push(headers.map(h => `"${h}"`).join(','));

        const companyStats: { [name: string]: { applied: number; selected: number } } = {};

        this.allApplications.forEach((app: any) => {
          const drive = this.allDrives.find((d: any) => String(d.id || d._id) === String(app.driveId || app.placementId));
          const company = app.companyName || drive?.companyName || drive?.companyName_PlacementDrive_Text || 'Unknown Company';
          if (!companyStats[company]) companyStats[company] = { applied: 0, selected: 0 };
          
          companyStats[company].applied++;
          if ((app.status || '').toLowerCase() === 'selected') {
            companyStats[company].selected++;
          }
        });

        Object.keys(companyStats).forEach(company => {
          const stats = companyStats[company];
          const rate = stats.applied > 0 ? Math.round((stats.selected / stats.applied) * 100) + '%' : '0%';
          csvRows.push(`"${company}","${stats.applied}","${stats.selected}","${rate}"`);
        });

      } else if (option === 'selections') {
        const headers = ['Company Name', 'Job Role', 'Number of Selections', 'Selected Students (Name - Register No)'];
        csvRows.push(headers.map(h => `"${h}"`).join(','));

        const driveSelections: { [key: string]: { companyName: string, role: string, students: string[] } } = {};

        this.allApplications.forEach((app: any) => {
          if ((app.status || '').toLowerCase() !== 'selected') return;

          const student = this.allStudents.find((s: any) =>
            String(s.id) === String(app.studentId) ||
            (s.rollNo || s.registerNumber || s.rollNo_PlacementStudent_Text || '').toLowerCase().trim() === (app.studentRegisterNumber || app.rollNo || '').toLowerCase().trim()
          );

          const sName = student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() : app.studentName || 'Unknown';
          const sReg = student ? (student.rollNo || student.registerNumber || student.rollNo_PlacementStudent_Text || 'Unknown') : (app.studentRegisterNumber || app.rollNo || 'Unknown');
          const studentString = `${sName} (${sReg})`;

          const drive = this.allDrives.find((d: any) => String(d.id || d._id) === String(app.driveId || app.placementId));
          const companyName = app.companyName || drive?.companyName || drive?.companyName_PlacementDrive_Text || 'Unknown Company';
          
          let role = app.role || drive?.role || '—';
          
          const jobsArray = drive?.jobs || drive?.jobs_PlacementDrive_DocumentArray;
          if (app.jobId && jobsArray && Array.isArray(jobsArray)) {
            const j = jobsArray.find((job: any) => job.jobId === app.jobId || job.jobId_PlacementDrive_Text === app.jobId);
            if (j) role = j.role || j.role_PlacementDrive_Text || '—';
          }

          const key = companyName + '_' + role;
          if (!driveSelections[key]) {
            driveSelections[key] = { companyName, role, students: [] };
          }
          driveSelections[key].students.push(studentString);
        });

        Object.values(driveSelections).forEach(ds => {
          const joinedStudents = ds.students.join(', ');
          csvRows.push(`"${ds.companyName}","${ds.role}","${ds.students.length}","${joinedStudents}"`);
        });
      }

    } else {
      const cols: string[] = [];
      const colKeys: string[] = [];

      this.customReportFields.forEach(f => {
        if (f.checked) {
          cols.push(f.label);
          colKeys.push(f.key);
        }
      });

      if (cols.length === 0) {
        cols.push('Roll Number', 'Name', 'Course', 'CGPA', 'Status');
        colKeys.push('registerNumber', 'name', 'course', 'cgpa', 'placed');
      }

      csvRows.push(cols.map(c => `"${c}"`).join(','));

      this.allStudents.forEach((s: any) => {
        const rowData = colKeys.map(key => {
          if (key === 'name') {
            return `"${s.firstName || ''} ${s.lastName || ''}"`;
          } else if (key === 'registerNumber') {
            return `"${s.rollNo || s.registerNumber || ''}"`;
          } else if (key === 'course') {
            return `"${s.specialization || s.course || s.departmentName || ''}"`;
          } else if (key === 'cgpa') {
            return `"${s.cgpa || ''}"`;
          } else if (key === 'placed') {
            const isPlaced = s.isPlaced === true || s.status === 'Selected';
            return `"${isPlaced ? 'Placed' : 'Not Placed'}"`;
          }
          return `"${s[key] || ''}"`;
        });
        csvRows.push(rowData.join(','));
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => encodeURIComponent(e)).join('%0A');
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    const filename = this.reportTemplateName ? `${this.reportTemplateName.replace(/\s+/g, '_')}.csv` : 'placement_report.csv';
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.reportsOpen = false;
  }

  // ── RECRUITMENT WIZARD METHODS ──
  openWizard(): void {
    this.resetWizard();
    this.wizardOpen = true;
  }

  closeWizard(): void {
    this.wizardOpen = false;
  }

  resetWizard(): void {
    this.step = 1;
    this.cid = 1;
    this.companies = [{ id: this.cid, masterId: '', name: '', industry: '' }];
    this.jobs = { [this.cid]: [] };
    this.batchDates = {};
  }

  getDynamicTotalSteps(): number {
    let needsForm = false;
    this.companies.forEach(c => {
      const jlist = this.jobs[c.id] || [];
      jlist.forEach((j, ji) => {
        const key = `${c.id}_${ji}`;
        if (this.batchDates[key] && this.batchDates[key].requiresDataCollection) {
          needsForm = true;
        }
      });
    });
    return needsForm ? 4 : 3;
  }

  validateCurrentStep(): boolean {
    if (this.step === 1) {
      for (const c of this.companies) {
        if (!c.masterId) {
          this.toastService.error('Please select a company.');
          return false;
        }
        if (!c.industry) {
          this.toastService.error('Please select an industry for all companies.');
          return false;
        }
      }
    } else if (this.step === 2) {
      for (const c of this.companies) {
        const jlist = this.jobs[c.id] || [];
        if (jlist.length === 0) {
          this.toastService.error(`Please add at least one job opening for ${c.name || 'each company'}.`);
          return false;
        }
        for (const j of jlist) {
          if (!j.role || !j.role.trim()) {
            this.toastService.error('Please enter a role/job title.');
            return false;
          }
          if (!j.type) {
            this.toastService.error('Please select an employment type.');
            return false;
          }
          if (!j.desc || !j.desc.trim()) {
            this.toastService.error('Please enter a job description.');
            return false;
          }
          if (!j.ctc || !j.ctc.trim()) {
            this.toastService.error('Please enter the compensation/CTC.');
            return false;
          }
          if (j.minAgg === null || j.minAgg === undefined) {
            this.toastService.error('Please enter the minimum aggregate percentage.');
            return false;
          }
        }
      }
    } else if (this.step === 3) {
      for (const c of this.companies) {
        const jlist = this.jobs[c.id] || [];
        for (let ji = 0; ji < jlist.length; ji++) {
          const key = `${c.id}_${ji}`;
          const bd = this.batchDates[key];
          if (!bd || !bd.batches || bd.batches.length === 0) {
            this.toastService.error(`Please select at least one eligible batch for ${c.name} - ${jlist[ji].role}.`);
            return false;
          }
          if (!bd.openDate) {
            this.toastService.error(`Please select an open date for ${c.name} - ${jlist[ji].role}.`);
            return false;
          }
          if (!bd.closeDate) {
            this.toastService.error(`Please select a close date for ${c.name} - ${jlist[ji].role}.`);
            return false;
          }
        }
      }
    }
    return true;
  }

  nextStep(): void {
    if (!this.validateCurrentStep()) {
      return;
    }
    const total = this.getDynamicTotalSteps();
    if (this.step < total) {
      this.step++;
      if (this.step === 2) {
        this.companies.forEach(c => {
          if (!this.jobs[c.id]) this.jobs[c.id] = [];
        });
      } else if (this.step === 3) {
        this.companies.forEach(c => {
          const jlist = this.jobs[c.id] || [];
          jlist.forEach((j, ji) => {
            const key = `${c.id}_${ji}`;
            if (!this.batchDates[key]) {
              this.batchDates[key] = { batches: [], openDate: '', closeDate: '', requiresDataCollection: false, questions: [] };
            }
          });
        });
      }
    } else {
      this.saveDrives();
    }
  }

  prevStep(): void {
    if (this.step > 1) {
      this.step--;
    }
  }

  addCompany(): void {
    this.cid++;
    this.companies.push({ id: this.cid, masterId: '', name: '', industry: '' });
    this.jobs[this.cid] = [];
  }

  removeCompany(index: number): void {
    const id = this.companies[index].id;
    this.companies.splice(index, 1);
    delete this.jobs[id];
  }

  selectCompany(index: number, masterId: string): void {
    const master = this.COMPANY_MASTER.find(c => c.id === masterId);
    if (master) {
      this.companies[index].masterId = masterId;
      this.companies[index].name = master.name;
      this.companies[index].industry = master.industry || '';
    }
  }

  addJob(compId: number): void {
    if (!this.jobs[compId]) this.jobs[compId] = [];
    this.jobs[compId].push({
      role: '',
      type: 'Full-Time',
      desc: '',
      ctc: '',
      minAgg: null,
      backlogAllowed: false,
      _open: true
    });
  }

  removeJob(compId: number, ji: number): void {
    this.jobs[compId].splice(ji, 1);
  }

  toggleJob(compId: number, ji: number): void {
    this.jobs[compId][ji]._open = !this.jobs[compId][ji]._open;
  }

  addBatch(key: string, event: Event): void {
    const target = event.target as HTMLSelectElement;
    const bid = target.value;
    if (!bid) return;
    if (!this.batchDates[key]) {
      this.batchDates[key] = { batches: [], openDate: '', closeDate: '', requiresDataCollection: false, questions: [] };
    }
    if (!this.batchDates[key].batches.includes(bid)) {
      this.batchDates[key].batches.push(bid);
    }
    target.value = '';
  }

  removeBatch(key: string, bid: string): void {
    if (this.batchDates[key]) {
      this.batchDates[key].batches = this.batchDates[key].batches.filter(b => b !== bid);
    }
  }

  toggleDataCollection(key: string, checked: boolean): void {
    let bd = this.batchDates[key];
    if (!bd) {
      bd = { batches: [], openDate: '', closeDate: '', requiresDataCollection: false, questions: [] };
      this.batchDates[key] = bd;
    }
    bd.requiresDataCollection = checked;
    if (checked && (!bd.questions || !bd.questions.length)) {
      bd.questions = [{ label: '', type: 'Short Text', required: false }];
    }
  }

  addQuestion(key: string): void {
    const bd = this.batchDates[key];
    if (!bd) return;
    if (!bd.questions) {
      bd.questions = [];
    }
    bd.questions.push({ label: '', type: 'Short Text', required: false });
  }

  removeQuestion(key: string, qi: number): void {
    const bd = this.batchDates[key];
    if (bd && bd.questions) {
      bd.questions.splice(qi, 1);
    }
  }

  toggleRequired(key: string, qi: number): void {
    const bd = this.batchDates[key];
    if (bd && bd.questions && bd.questions[qi]) {
      bd.questions[qi].required = !bd.questions[qi].required;
    }
  }

  saveDrives(): void {
    this.companies.forEach(c => {
      const jlist = this.jobs[c.id] || [];
      jlist.forEach((j, ji) => {
        const key = `${c.id}_${ji}`;
        const bd = this.batchDates[key] || { batches: [], openDate: '', closeDate: '', requiresDataCollection: false, questions: [] };
        
        const companyIdVal = c.masterId || 'C' + Math.floor(100 + Math.random() * 900);
        const codeVal = c.name.substring(0, 3).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
        const batchCodeVal = bd.batches && bd.batches.length > 0 ? bd.batches[0] : 'ALL';
        const startVal = bd.openDate || new Date().toISOString().substring(0, 10);
        const endVal = bd.closeDate || new Date().toISOString().substring(0, 10);

        const jobsPayload = [{
          companyId_PlacementDrive_Text: companyIdVal,
          role_PlacementDrive_Text: j.role || 'Software Engineer',
          description_PlacementDrive_Text: j.desc || '',
          eligibleBatches_PlacementDrive_TextArray: bd.batches.map((b: string) => {
            const master = this.BATCH_MASTER.find((bm: any) => bm.id === b);
            return master ? master.label : b;
          }),
          employmentType_PlacementDrive_Text: j.type || 'Full-Time',
          packageLpa_PlacementDrive_Text: j.ctc ? String(j.ctc) : '6.0',
          minCgpa_PlacementDrive_Double: j.minAgg ? Number(j.minAgg) / 10 : 6.0,
          active_PlacementDrive_Bool: true,
          allowBacklog_PlacementDrive_Bool: j.backlogAllowed || false,
          fields_PlacementDrive_DocumentArray: bd.requiresDataCollection && bd.questions ? bd.questions.map((q: any) => ({
            label_PlacementDrive_Text: q.label || 'Field',
            fieldType_PlacementDrive_Text: q.type || 'Short Text',
            required_PlacementDrive_Bool: q.required || false
          })) : []
        }];

        const payload = {
          companyCode_PlacementDrive_Text: codeVal,
          companyId_PlacementDrive_Text: companyIdVal,
          companyName_PlacementDrive_Text: c.name,
          batchCode_PlacementDrive_Text: batchCodeVal,
          driveStart_PlacementDrive_Date: startVal,
          driveEnd_PlacementDrive_Date: endVal,
          jobs_PlacementDrive_DocumentArray: jobsPayload
        };

        this.placementApi.createDrive(payload).subscribe({
          next: () => {
            console.log('Saved placement drive successfully');
            this.loadRecentDrives();
            this.loadStats();
            this.cdr.detectChanges();
          },
          error: () => {
            console.log('Saved locally to mock store:', payload);
            this.recentDrives.push({
              companyName: c.name,
              role: j.role,
              type: j.type,
              packageCTC: j.ctc,
              location: 'Bengaluru, India',
              status: 'Intake Open',
              statusClass: 'badge-open',
              openDate: bd.openDate,
              closeDate: bd.closeDate,
              minimumCgpa: j.minAgg ? Number(j.minAgg) / 10 : 6.0,
              eligibleCourses: bd.batches.map((b: string) => {
                const master = this.BATCH_MASTER.find((bm: any) => bm.id === b);
                return master ? master.label : b;
              })
            });
            this.cdr.detectChanges();
          }
        });
      });
    });
    this.step = this.getDynamicTotalSteps() + 1; // success screen
    this.cdr.detectChanges();
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
