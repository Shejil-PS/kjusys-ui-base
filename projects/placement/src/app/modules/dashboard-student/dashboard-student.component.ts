import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, catchError, filter } from 'rxjs/operators';
import { SharedToastService } from '@libs/shared-toast';
import { environment } from '../../../environments/environment';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Breadcrumb } from '@libs/shared-ui';

export interface Profile {
  id: string; // compatibility
  _id?: string; // database
  name: string; // compatibility
  firstName?: string; // database
  lastName?: string; // database
  course: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
  skills: string;
  projects: string;
  achievements: string;
  score10th: string;
  score12th: string;
  cgpa: string;
  attendance: string;
  placementOptIn: boolean;
  resumeUploaded: boolean;
  resumeFileName: string | null;
  resumeFileSize: string | null;
  resumeUrl?: string | null;
  offerLetterUploaded?: boolean;
  offerLetterFileName?: string | null;
  offerLetterUrl?: string | null;
  isPlaced: boolean;
  placedCompany: string | null;
  placedRole: string | null;
  placedLpa: number | null;
  rollNo: string;
  gender: string;
  dob?: string;
  section?: string;
  specialization: string;
  departmentName: string;
  backlogs: number;
  freeze: boolean;
  active?: boolean;
  optedIn?: boolean;
  optedInStatus: string;
  batchCode: string;
  internshipDetails?: Array<{
    companyName: string;
    location: string;
    jobType: string;
    duration: string;
  }>;
}

export interface Reminder {
  id: number;
  company: string;
  title: string;
  type: string;
  date: string;
}

export interface FormAnswer {
  answerId: string;
  fieldId: string;
  answer: string;
}

export interface Application {
  id: number; // compatibility
  applicationId?: string; // database
  studentId: string;
  rollNo?: string;
  studentName?: string;
  placementId?: string;
  jobId?: string;
  companyId?: string;
  companyName?: string; // database
  company: string; // compatibility
  title: string; // compatibility
  appliedDate?: string;
  dateApplied: string; // compatibility
  lpa: number; // compatibility
  status: 'Selected' | 'In Progress' | 'Not Selected' | 'Upcoming Drive' | 'Placed' | string;
  resumeUrl?: string;
  formAnswers?: FormAnswer[];
}

export interface DriveField {
  fieldId: string;
  label: string;
  fieldType: string; // 'text' | 'dropdown' | 'select' | 'number'
  required: boolean;
  options?: string[];
}

export interface Drive {
  id: number; // compatibility
  jobId: string;
  placementId: string;
  companyId: string;
  company: string; // compatibility (companyName)
  title: string; // compatibility (role)
  lpa: number; // compatibility (packageLPA)
  location: string;
  minAggregate: string;
  minCGPA: number;
  deadline: string; // compatibility (driveEnd)
  type: string; // compatibility (employmentType)
  stipend: string;
  appOpens: string; // compatibility (driveStart)
  appCloses: string; // compatibility (driveEnd)
  backlogs: string;
  allowBacklog: boolean;
  courses: string; // compatibility (eligibleBatches)
  eligibleBatches: string;
  eligibleBranches?: string;
  description: string;
  skills: string[];
  about: string;
  additionalQuestions: DriveField[];
  fields?: DriveField[]; // database compatibility
  active?: boolean;
  status?: string;
}

export interface OfferLetter {
  uploaded: boolean;
  fileUrl: string | null;
  fileName: string | null;
}

export const extractDataArray = (obj: any): any[] => {
  if (Array.isArray(obj)) return obj;
  if (obj && Array.isArray(obj.responseData?.data?.data)) return obj.responseData.data.data;
  if (obj && Array.isArray(obj.responseData?.data)) return obj.responseData.data;
  if (obj && Array.isArray(obj.responseData)) return obj.responseData;
  if (obj && Array.isArray(obj.data)) return obj.data;
  if (obj && Array.isArray(obj.value)) return obj.value;
  return [];
};

export const safeFormatDate = (rawDate: any): string => {
  if (!rawDate) return '';
  try {
    if (typeof rawDate === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
      const parts = rawDate.split('-');
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toLocaleDateString();
    }
    const d = new Date(rawDate);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  } catch (e) {
    return '';
  }
};

export const extractDataObject = (obj: any): any => {
  if (!obj) return obj;
  if (obj.responseData?.data?.data) return obj.responseData.data.data;
  if (obj.responseData?.data) return obj.responseData.data;
  if (obj.responseData) return obj.responseData;
  if (obj.data) return obj.data;
  return obj;
};

export function mapBackendToProfile(data: any): Profile {
  data = extractDataObject(data) || {};
  const parseBool = (val: any, defaultVal: boolean) => {
    if (val === undefined || val === null) return defaultVal;
    if (typeof val === 'string') return val.toLowerCase() === 'true';
    return !!val;
  };
  return {
    id: data._id || data.id,
    _id: data._id || data.id,
    rollNo: data.rollNo_PlacementStudent_Text || data.rollNo || '',
    firstName: data.firstName_PlacementStudent_Text || data.firstName || '',
    lastName: data.lastName_PlacementStudent_Text || data.lastName || '',
    name: data.name || `${data.firstName_PlacementStudent_Text || data.firstName || ''} ${data.lastName_PlacementStudent_Text || data.lastName || ''}`.trim() || '',
    gender: data.gender_PlacementStudent_Text || data.gender || '',
    dob: (() => {
      try {
        const rawDob = data.dob_PlacementStudent_Date || data.dob;
        if (!rawDob) return '';
        // If DD-MM-YYYY, convert to YYYY-MM-DD
        if (typeof rawDob === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(rawDob)) {
          const parts = rawDob.split('-');
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        const d = new Date(rawDob);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    })(),
    section: data.section_PlacementStudent_Text || data.section || '',
    specialization: data.specialization_PlacementStudent_Text || data.specialization || data.course || '',
    departmentName: data.departmentName_PlacementStudent_Text || data.departmentName || '',
    email: data.email_PlacementStudent_Text || data.email || '',
    batchCode: data.batchCode_PlacementStudent_Text || data.batchCode || '',
    optedIn: parseBool(data.optedIn_PlacementStudent_Bool, parseBool(data.optedIn, false)),
    optedInStatus: data.optInStatus || (data.optedIn === true || data.optedIn_PlacementStudent_Bool === true ? 'opted_in' : (data.optedIn === false || data.optedIn_PlacementStudent_Bool === false ? 'opted_out' : 'pending')),
    placementOptIn: parseBool(data.optedIn_PlacementStudent_Bool, parseBool(data.optedIn, parseBool(data.placementOptIn, false))),
    cgpa: data.cgpa_PlacementStudent_Double ? data.cgpa_PlacementStudent_Double.toString() : (data.cgpa ? data.cgpa.toString() : '0'),
    course: data.specialization_PlacementStudent_Text || data.specialization || data.course || '',
    phone: data.phone_PlacementStudent_Long ? data.phone_PlacementStudent_Long.toString() : (data.phone || ''),
    linkedin: data.linkedin_PlacementStudent_Text || data.linkedin || '',
    github: data.github_PlacementStudent_Text || data.github || '',
    skills: data.skills_PlacementStudent_Text || data.skills || '',
    projects: data.projects_PlacementStudent_Text || data.projects || '',
    achievements: data.studentAchievements_PlacementStudent_Text || data.achievements || '',
    score10th: data.score10th || data.tenthPer_PlacementStudent_Double?.toString() || data.tenthPercentage?.toString() || '',
    score12th: data.score12th || data.twelthPer_PlacementStudent_Double?.toString() || data.twelfthPercentage?.toString() || '',
    attendance: data.attendance_PlacementStudent_Text || data.attendance || '',
    resumeUploaded: !!data.studentResume_PlacementStudent_Text || parseBool(data.resumeUploaded, false),
    resumeFileName: data.studentResume_PlacementStudent_Text || data.resumeFileName || null,
    resumeFileSize: data.resumeFileSize || null,
    resumeUrl: data.resumeUrl || null,
    offerLetterUploaded: parseBool(data.offerLetter_PlacementStudent_Document?.uploaded || data.offerLetter_PlacementStudent_Document?.offerLetterUploaded || false, false),
    offerLetterFileName: data.offerLetter_PlacementStudent_Document?.fileName || data.offerLetter_PlacementStudent_Document?.offerLetterFileName || null,
    offerLetterUrl: data.offerLetter_PlacementStudent_Document?.fileUrl || data.offerLetter_PlacementStudent_Document?.offerLetterUrl || null,
    isPlaced: parseBool(data.isPlaced, false),
    placedCompany: data.placedCompany || null,
    placedRole: data.placedRole || null,
    placedLpa: data.placedLpa || null,
    backlogs: data.backlogs_PlacementStudent_Int !== undefined ? data.backlogs_PlacementStudent_Int : (data.backlogs !== undefined ? parseInt(data.backlogs, 10) : 0),
    freeze: parseBool(data.freeze_PlacementStudent_Bool, parseBool(data.freeze, false)),
    active: parseBool(data.active_PlacementStudent_Bool, parseBool(data.active, false)),
    internshipDetails: (() => {
      const arr = extractDataArray(data.internshipDetails_PlacementStudent_DocumentArray || data.internshipDetails || []).map(i => ({
        companyName: i.companyName_PlacementStudent_Text || i.companyName || '',
        location: i.location_PlacementStudent_Text || i.location || '',
        jobType: i.jobType_PlacementStudent_Text || i.jobType || '',
        duration: i.duration_PlacementStudent_Text || i.duration || ''
      }));
      return arr;
    })()
  };
}

export function checkEligibility(drive: Drive, profile: Profile): { eligible: boolean; reason?: string } {
  if (profile.freeze) {
    return { eligible: false, reason: 'Your placement profile is currently frozen' };
  }
  if (!profile.placementOptIn && !profile.optedIn) {
    return { eligible: false, reason: 'You have not opted-in for placements' };
  }
  const studentCGPA = parseFloat(profile.cgpa || '0');
  if (studentCGPA < drive.minCGPA) {
    return { eligible: false, reason: `CGPA criteria not met (Min required: ${drive.minCGPA}, Your CGPA: ${profile.cgpa})` };
  }
  if (!drive.allowBacklog && profile.backlogs > 0) {
    return { eligible: false, reason: `Backlogs not allowed (You have ${profile.backlogs} backlog)` };
  }
  if (drive.eligibleBatches && profile.batchCode) {
    const isBatchEligible = drive.eligibleBatches.includes(profile.batchCode);
    if (!isBatchEligible) return { eligible: false, reason: `Your batch ${profile.batchCode} is not eligible` };
  }
  if (drive.eligibleBranches && profile.course) {
    const isBranchEligible = drive.eligibleBranches.includes(profile.course);
    if (!isBranchEligible) return { eligible: false, reason: `Your course ${profile.course} is not eligible` };
  }

  return { eligible: true };
}

export function evaluateDriveStatus(closeDateRaw: any, activeFlag?: boolean, rawStatus?: string): 'open' | 'closed' | 'results' {
  if (activeFlag === false || rawStatus === 'closed' || rawStatus === 'Intake Closed') {
    return 'closed';
  }
  if (rawStatus === 'results' || rawStatus === 'Results Declared') {
    return 'results';
  }
  if (!closeDateRaw) {
    return 'open';
  }

  let closeDateObj: Date | null = null;
  if (closeDateRaw instanceof Date) {
    closeDateObj = closeDateRaw;
  } else if (typeof closeDateRaw === 'string') {
    const str = closeDateRaw.trim();
    if (!str) return 'open';

    const ddmmyyyyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
      const year = parseInt(ddmmyyyyMatch[3], 10);
      closeDateObj = new Date(year, month, day, 23, 59, 59, 999);
    } else {
      const yyyymmddMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (yyyymmddMatch) {
        const year = parseInt(yyyymmddMatch[1], 10);
        const month = parseInt(yyyymmddMatch[2], 10) - 1;
        const day = parseInt(yyyymmddMatch[3], 10);
        closeDateObj = new Date(year, month, day, 23, 59, 59, 999);
      } else {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          closeDateObj = parsed;
        }
      }
    }
  }

  if (closeDateObj && !isNaN(closeDateObj.getTime())) {
    const now = new Date();
    if (closeDateObj.getTime() < now.getTime()) {
      return 'closed';
    }
  }

  return 'open';
}

export function mapBackendToDrives(data: any): Drive[] {
  data = extractDataObject(data);
  const drives: Drive[] = [];
  const placementId = data._id || data.id;
  const companyCode = data.companyCode_PlacementDrive_Text || data.companyId_PlacementDrive_Text || data.companyCode || data.companyId || '';
  const companyName = data.companyName_PlacementDrive_Text || data.companyName || data.company || '';
  const driveStart = data.driveStart_PlacementDrive_Date || data.driveStart || data.appOpens;
  const driveEnd = data.driveEnd_PlacementDrive_Date || data.driveEnd || data.appCloses || data.deadline;
  const globalBatches = data.batchCode_PlacementDrive_Text || data.batchCode || data.eligibleBatches || '';

  const jobs = data.jobs_PlacementDrive_DocumentArray || data.jobs || (data.jobId ? [data] : []);
  const rootFields = data.fields_PlacementDrive_DocumentArray || data.fields || data.additionalQuestions || [];

  for (const job of jobs) {
    const jobFields = job.fields_PlacementDrive_DocumentArray || job.fields || job.additionalQuestions || rootFields;
    const parsedFields = jobFields.map((f: any) => ({
      fieldId: f.fieldId_PlacementDrive_Text || f.fieldId,
      label: f.label_PlacementDrive_Text || f.label,
      fieldType: f.fieldType_PlacementDrive_Text || f.fieldType,
      required: f.required_PlacementDrive_Bool || f.required || false,
      options: f.options_PlacementDrive_TextArray || f.options || []
    }));

    let eligibleBatches = '';
    if (job.eligibleBatches_PlacementDrive_TextArray && Array.isArray(job.eligibleBatches_PlacementDrive_TextArray)) {
      eligibleBatches = job.eligibleBatches_PlacementDrive_TextArray.join(', ');
    } else if (job.eligibleBatches && Array.isArray(job.eligibleBatches)) {
      eligibleBatches = job.eligibleBatches.join(', ');
    } else if (typeof job.eligibleBatches === 'string') {
      eligibleBatches = job.eligibleBatches;
    } else {
      eligibleBatches = globalBatches;
    }

    const isJobActive = job.active_PlacementDrive_Bool !== false && job.active !== false;
    const computedStatus = evaluateDriveStatus(driveEnd, isJobActive, data.status);
    const active = computedStatus === 'open';

    drives.push({
      id: job.id || 0,
      jobId: job.jobId_PlacementDrive_Text || job.jobId || '',
      placementId: placementId,
      companyId: companyCode,
      company: companyName,
      title: job.role_PlacementDrive_Text || job.role || job.title || '',
      lpa: job.packageLpa_PlacementDrive_Text ? parseFloat(job.packageLpa_PlacementDrive_Text) : (job.packageLpa ? parseFloat(job.packageLpa) : (job.lpa || 0)),
      location: job.location || '',
      minAggregate: job.minCgpa_PlacementDrive_Double ? job.minCgpa_PlacementDrive_Double.toString() : (job.minCgpa ? job.minCgpa.toString() : (job.minAggregate || '0')),
      minCGPA: job.minCgpa_PlacementDrive_Double || job.minCgpa || job.minCGPA || 0,
      deadline: safeFormatDate(driveEnd),
      type: job.employmentType_PlacementDrive_Text || job.employmentType || job.type || '',
      stipend: job.stipend || '',
      appOpens: safeFormatDate(driveStart),
      appCloses: safeFormatDate(driveEnd),
      backlogs: (job.allowBacklog_PlacementDrive_Bool || job.allowBacklog) ? 'Allowed' : 'Not Allowed',
      allowBacklog: job.allowBacklog_PlacementDrive_Bool || job.allowBacklog || false,
      courses: globalBatches,
      eligibleBatches: globalBatches,
      description: job.description_PlacementDrive_Text || job.description || '',
      skills: job.skills || [],
      about: job.about || '',
      additionalQuestions: parsedFields,
      fields: parsedFields,
      active: active
    });
  }
  return drives;
}

export function mapBackendToApplication(data: any): Application {
  data = extractDataObject(data);
  const formAnswers = (data.formAnswers || data.formAnswers_PlacementAppilcation_DocumentArray || []).map((ans: any) => ({
    answerId: ans.answerId || ans.answerId_PlacementAppilcation_Text || '',
    fieldId: ans.fieldId || ans.fieldId_PlacementAppilcation_Text || '',
    answer: ans.answer || ans.answer_PlacementAppilcation_Text || ''
  }));

  const appliedDateRaw = data.appliedDate || data.appiliedDate_PlacementAppilcation_Date || data.dateApplied;
  const appliedDate = safeFormatDate(appliedDateRaw);

  let extractedStudentId = data.studentId || data.studentId_PlacementAppilcation_Text || data.userId || '';
  if (data.student && typeof data.student === 'object') {
    extractedStudentId = data.student._id || data.student.id || extractedStudentId;
  } else if (typeof data.student === 'string') {
    extractedStudentId = data.student;
  }

  return {
    id: data.id || 0,
    applicationId: data.applicationId || data.appilcationId_PlacementAppilcation_Text || data._id,
    studentId: extractedStudentId,
    rollNo: data.rollNo || data.rollNo_PlacementAppilcation_Text || '',
    studentName: data.studentName || data.studentName_PlacementAppilcation_Text || '',
    placementId: data.placementId || data.placementId_PlacementAppilcation_Text || '',
    jobId: data.jobId || data.jobId_PlacementAppilcation_Text || '',
    companyId: data.companyCode || data.companyCode_PlacementAppilcation_Text || data.companyId || '',
    companyName: data.companyName || data.companyName_PlacementAppilcation_Text || data.company || '',
    company: data.companyName || data.companyName_PlacementAppilcation_Text || data.company || '',
    title: data.role || data.role_PlacementAppilcation_Text || data.title || 'Role',
    appliedDate: appliedDate,
    dateApplied: appliedDate,
    lpa: data.lpa || 0,
    status: (() => {
      let s = data.status || data.status_PlacementAppilcation_Text || 'Applied';
      if (s === 'Applied') return 'In Progress';
      return s;
    })(),
    resumeUrl: data.resumeUrl || '',
    formAnswers: formAnswers
  };
}


@Component({
  selector: 'app-dashboard-student',
  templateUrl: './dashboard-student.component.html',
  styleUrls: ['./dashboard-student.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DashboardStudentComponent implements OnInit {
  private profileSubject = new BehaviorSubject<Profile | null>(null);
  public profile$ = this.profileSubject.asObservable();

  private applicationsSubject = new BehaviorSubject<Application[]>([]);
  public applications$ = this.applicationsSubject.asObservable();

  private offerLetterSubject = new BehaviorSubject<OfferLetter>({ uploaded: false, fileUrl: null, fileName: null });
  public offerLetter$ = this.offerLetterSubject.asObservable();

  private profileModalOpenSubject = new BehaviorSubject<boolean>(false);
  public isProfileModalOpen$ = this.profileModalOpenSubject.asObservable();

  private remindersSubject = new BehaviorSubject<Reminder[]>([]);
  public reminders$: Observable<Reminder[]> = this.remindersSubject.asObservable();
  public latestDrive!: Drive;
  public showRemoveOfferModal = false;

  // Add dummy observables so template doesn't crash if it looks for student switcher
  public students$: Observable<Profile[]> = new BehaviorSubject([]);
  public activeStudentId$: Observable<string> = new BehaviorSubject('6a2b808f2cfa1b3892b73335');

  // Edit profile form state
  public editForm: Partial<Profile> = {};
  public showRemoveResumeModal = false;
  public resumeDragOver = false;

  public registrationBreadcrumbs: Breadcrumb[] = [
    { label: 'Placements' },
    { label: 'Student Registration' }
  ];

  // New Form variables
  public currentStep = 1;
  public totalSteps = 1;
  public showSuccessModal = false;

  public registrationForm: any = {
    optingFor: '',
    termsGuidelines: false,
    termsAccuracy: false,
    termsAttendance: false,
    termsDisqualification: false,
    personalEmail: '',
    mobileNumber: '',
    altMobileNumber: '',
    panCard: '',
    aadharCard: '',
    drivingLicense: '',
    bloodGroup: '',
    fatherName: '',
    fatherOccupation: '',
    presentAddress: '',
    permanentAddress: '',
    sslcInstitution: '',
    sslcLocation: '',
    sslcPercentage: null,
    puInstitution: '',
    puLocation: '',
    puPercentage: null,
    degreeInstitution: '',
    degreeLocation: '',
    degreePercentage: null,
    degreeBacklogs: 'no',
    degreeBacklogsCount: null,
    pgInstitution: '',
    pgPercentage: null,
    pgBacklogs: 'no',
    pgBacklogsCount: null,
    hasInternships: '',
    hasExperience: '',
    experienceCompany: '',
    experienceMonths: null,
    attendancePercentage: null,
    willAdhereCecr: false,
    declarationFile: null,
    resumeFile: null
  };

  private currentStudentId = '6a2b808f2cfa1b3892b73335'; // Mock active user ID
  public declarationFileUrl: string | SafeUrl = '';

  public dashBreadcrumbs: Breadcrumb[] = [
    { label: 'Placements' },
    { label: 'Dashboard' }
  ];

  public profileBreadcrumbs: Breadcrumb[] = [
    { label: 'Placements' },
    { label: 'Placement Profile' }
  ];

  constructor(
    private http: HttpClient,
    private toastService: SharedToastService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.profileModalOpenSubject.next(false);

    // Fetch Declarations
    this.http.get<any>(`${environment.baseUrl}/placements-app/list-declarations`).subscribe({
      next: (res) => {
        const rawData = res?.responseData?.data || res?.data || res;
        const declList = Array.isArray(rawData) ? rawData : (rawData?.data && Array.isArray(rawData.data) ? rawData.data : []);
        if (declList && declList.length > 0) {
          const firstDeclaration = declList[0];
          const rawUrl = firstDeclaration.declarationForm_PlacementDeclare_Text;
          if (rawUrl) {
            this.declarationFileUrl = rawUrl.startsWith('data:') 
              ? this.sanitizer.bypassSecurityTrustUrl(rawUrl) 
              : rawUrl;
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to fetch declarations', err)
    });

    // Fetch Profile
    this.http.get<any>(`${environment.baseUrl}/placements-app/get-student/${this.currentStudentId}`).pipe(
      map(data => {
        const raw = extractDataObject(data) || {};
        const prof = mapBackendToProfile(data);
        return { raw, prof };
      })
    ).subscribe({
      next: ({ raw, prof }) => {
        this.profileSubject.next(prof);
        this.editForm = { ...prof };
        this.offerLetterSubject.next({
          uploaded: prof.offerLetterUploaded || false,
          fileName: prof.offerLetterFileName || null,
          fileUrl: prof.offerLetterUrl || null
        });

        // Pre-fill registrationForm from existing backend data
        this.registrationForm = {
          ...this.registrationForm,
          personalEmail: raw.personalEmail_PlacementStudent_Text || raw.email_PlacementStudent_Text || this.registrationForm.personalEmail,
          mobileNumber: raw.phone_PlacementStudent_Long ? raw.phone_PlacementStudent_Long.toString() : this.registrationForm.mobileNumber,
          altMobileNumber: raw.altPhone_PlacementStudent_Long ? raw.altPhone_PlacementStudent_Long.toString() : this.registrationForm.altMobileNumber,
          panCard: raw.panCard_PlacementStudent_Text || this.registrationForm.panCard,
          aadharCard: raw.aadhar_PlacementStudent_Long ? raw.aadhar_PlacementStudent_Long.toString() : this.registrationForm.aadharCard,
          drivingLicense: raw.drivingLicense_PlacementStudent_Text || this.registrationForm.drivingLicense,
          bloodGroup: raw.bloodGroup_PlacementStudent_Text || this.registrationForm.bloodGroup,
          fatherName: raw.fatherName_PlacementStudent_Text || this.registrationForm.fatherName,
          fatherOccupation: raw.fatherOccupation_PlacementStudent_Text || this.registrationForm.fatherOccupation,
          presentAddress: raw.presentAddress_PlacementStudent_Text || this.registrationForm.presentAddress,
          permanentAddress: raw.permanentAddress_PlacementStudent_Text || this.registrationForm.permanentAddress,
          sslcInstitution: raw.tenthInstitution_PlacementStudent_Text || this.registrationForm.sslcInstitution,
          sslcLocation: raw.tenthLocation_PlacementStudent_Text || this.registrationForm.sslcLocation,
          sslcPercentage: raw.tenthPer_PlacementStudent_Double ?? this.registrationForm.sslcPercentage,
          puInstitution: raw.twelfthInstitution_PlacementStudent_Text || this.registrationForm.puInstitution,
          puLocation: raw.twelfthLocation_PlacementStudent_Text || this.registrationForm.puLocation,
          puPercentage: raw.twelthPer_PlacementStudent_Double ?? this.registrationForm.puPercentage,
          degreeInstitution: raw.degreeInstitution_PlacementStudent_Text || this.registrationForm.degreeInstitution,
          degreeLocation: raw.degreeLocation_PlacementStudent_Text || this.registrationForm.degreeLocation,
          degreePercentage: raw.cgpa_PlacementStudent_Double ?? this.registrationForm.degreePercentage,
          degreeBacklogs: (raw.backlogs_PlacementStudent_Int && raw.backlogs_PlacementStudent_Int > 0) ? 'yes' : 'no',
          degreeBacklogsCount: raw.backlogs_PlacementStudent_Int || this.registrationForm.degreeBacklogsCount,
          pgInstitution: raw.pgInstitution_PlacementStudent_Text || this.registrationForm.pgInstitution,
          pgPercentage: raw.pgPer_PlacementStudent_Double ?? this.registrationForm.pgPercentage,
          pgBacklogs: (raw.pgBacklogs_PlacementStudent_Text && raw.pgBacklogs_PlacementStudent_Text !== '0') ? 'yes' : 'no',
          pgBacklogsCount: raw.pgBacklogs_PlacementStudent_Text || this.registrationForm.pgBacklogsCount,
          attendancePercentage: raw.attendance_PlacementStudent_Text || this.registrationForm.attendancePercentage,
        };

        // Pre-fill internship/experience details if present
        const internships = raw.internshipDetails_PlacementStudent_DocumentArray;
        if (internships && Array.isArray(internships) && internships.length > 0) {
          this.registrationForm.hasExperience = 'yes';
          this.registrationForm.experienceCompany = internships[0].companyName_PlacementStudent_Text || internships[0].companyName || '';
          const durationStr = internships[0].duration_PlacementStudent_Text || internships[0].duration || '';
          const durationMatch = durationStr.match(/(\d+)/);
          this.registrationForm.experienceMonths = durationMatch ? parseInt(durationMatch[1], 10) : null;
        }

        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Failed to fetch profile', err);
        const fallbackProf = mapBackendToProfile({ _id: this.currentStudentId });
        this.profileSubject.next(fallbackProf);
        this.editForm = { ...fallbackProf };
        this.cdr.detectChanges();
      }
    });

    // Fetch Applications, Drives, Companies, and Batches Together
    const apps$ = this.http.get<any[]>(`${environment.baseUrl}/placements-app/list-applications`).pipe(catchError(() => of([])));
    const drives$ = this.http.get<any[]>(`${environment.baseUrl}/placements-app/placements`).pipe(catchError(() => of([])));
    const companies$ = this.http.get<any[]>(`${environment.baseUrl}/placements-app/list-companies`).pipe(catchError(() => of([])));
    const batches$ = this.http.get<any[]>(`${environment.baseUrl}/placements-app/list-batches`).pipe(catchError(() => of([])));
    const profile$ = this.profileSubject.asObservable().pipe(filter((p: any) => p !== null));

    combineLatest([apps$, drives$, companies$, batches$, profile$]).subscribe(([apps, placements, companies, batches, profile]) => {
      const companiesList = extractDataArray(companies);
      const batchesList = extractDataArray(batches);

      // 1. Process Applications & map Role/LPA from Drives (Do this first so userApps is available for hasApplied)
      const appsList = extractDataArray(apps);
      const userApps = appsList.map(a => mapBackendToApplication(a)).filter((a: Application) =>
        String(a.studentId).toLowerCase() === String(this.currentStudentId).toLowerCase());

      // 2. Process Drives (Placements Collection)
      let allDrives: Drive[] = [];
      const placementsList = extractDataArray(placements);
      if (placementsList && placementsList.length > 0) {
        placementsList.forEach((p: any) => {
          const mappedDrives = mapBackendToDrives(p);
          // Map location from company collection
          mappedDrives.forEach(drive => {
            const company = companiesList.find((c: any) =>
              c.companyCode_PlacementCompany_Text === drive.companyId ||
              c._id === drive.companyId ||
              (c.companyName_PlacementCompany_Text && drive.company && c.companyName_PlacementCompany_Text.toLowerCase() === drive.company.toLowerCase()) ||
              (c.companyName && drive.company && c.companyName.toLowerCase() === drive.company.toLowerCase())
            );
            if (company && company.companyAddress_PlacementCompany_Text) {
              drive.location = company.companyAddress_PlacementCompany_Text;
            } else if (company && company.companyAddress) {
              drive.location = company.companyAddress;
            }

            // Map batchCode - batchName
            if (drive.courses) {
              const codes = drive.courses.split(',').map((c: string) => c.trim());
              const mappedCodes = codes.map((code: string) => {
                let batch = batchesList.find((b: any) =>
                  (b.batchCode_PlacementBatches_Text && b.batchCode_PlacementBatches_Text.toLowerCase() === code.toLowerCase()) ||
                  (b.batchCode && b.batchCode.toLowerCase() === code.toLowerCase()) ||
                  (b.batchName_PlacementBatches_Text && b.batchName_PlacementBatches_Text.toLowerCase() === code.toLowerCase()) ||
                  (b.batchName && b.batchName.toLowerCase() === code.toLowerCase())
                );

                if (!batch) {
                  // Fallback to partial match if exact match fails
                  batch = batchesList.find((b: any) =>
                    (b.batchCode_PlacementBatches_Text && b.batchCode_PlacementBatches_Text.toLowerCase().includes(code.toLowerCase())) ||
                    (b.batchCode && b.batchCode.toLowerCase().includes(code.toLowerCase()))
                  );
                }

                if (batch) {
                  const bCode = batch.batchCode_PlacementBatches_Text || batch.batchCode;
                  const bName = batch.batchName_PlacementBatches_Text || batch.batchName;
                  return `${bCode} - ${bName}`;
                }
                return code;
              });
              drive.courses = mappedCodes.join(', ');
              drive.eligibleBatches = drive.courses;
            }
          });
          allDrives = allDrives.concat(mappedDrives);
        });
      }

      // Map Role/LPA from Drives to Applications now that allDrives is populated
      userApps.forEach(app => {
        // Map using jobId or placementId
        const linkedDrive = allDrives.find(d => String(d.jobId) === String(app.jobId) || String(d.placementId) === String(app.placementId));
        if (linkedDrive) {
          app.title = linkedDrive.title || app.title;
          app.lpa = linkedDrive.lpa || app.lpa;
          app.company = linkedDrive.company || app.company;
        }
      });

      if (allDrives.length > 0) {
        const hasApplied = (drive: Drive) => {
          return userApps.some(app =>
            String(app.jobId) === String(drive.jobId) ||
            (app.company.toLowerCase() === drive.company.toLowerCase() && app.title.toLowerCase() === drive.title.toLowerCase())
          );
        };

        const eligibleDrives = allDrives.filter(d => hasApplied(d) || checkEligibility(d, profile as Profile).eligible);
        this.latestDrive = eligibleDrives.length > 0 ? eligibleDrives[0] : allDrives[0];

        // Populate reminders with eligible upcoming drives that they have NOT applied to yet (allow up to 10 for scrolling)
        const unappliedEligibleDrives = eligibleDrives.filter(d => !hasApplied(d));
        const upcomingReminders = unappliedEligibleDrives.slice(0, 10).map(d => ({
          id: d.id,
          company: d.company,
          title: d.title,
          type: 'Upcoming Drive',
          date: d.appCloses || d.deadline || new Date().toLocaleDateString()
        }));
        this.remindersSubject.next(upcomingReminders);
      }

      this.applicationsSubject.next(userApps);
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 0);

      // 3. Derive Placement Status from Applications
      const selectedApp = userApps.find(a => a.status === 'Selected' || a.status === 'Placed' || a.status?.toLowerCase() === 'selected' || a.status?.toLowerCase() === 'placed');
      const currentProfile = this.profileSubject.value || mapBackendToProfile({ _id: this.currentStudentId });

      if (selectedApp) {
        this.profileSubject.next({
          ...currentProfile,
          isPlaced: true,
          placedCompany: selectedApp.company || selectedApp.companyName || 'Company',
          placedRole: selectedApp.title || 'Role',
          placedLpa: selectedApp.lpa || 0
        });
      } else if (!currentProfile.isPlaced) {
        this.profileSubject.next({
          ...currentProfile,
          isPlaced: false
        });
      }
    });
  }

  public openEditProfile(): void {
    this.profileModalOpenSubject.next(true);
  }

  public getActiveApplicationsCount(apps: Application[] | null): number {
    if (!apps) return 0;
    return apps.filter(a => {
      const s = (a.status || '').toLowerCase();
      return s === 'applied' || s === 'in progress' || s === 'selected' || s === 'on hold';
    }).length;
  }

  public triggerOfferLetterUpload(): void {
    const fileInput = document.getElementById('dashboard-offer-letter-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  public handleOfferLetterUpload(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
      }
      const fileUrl = URL.createObjectURL(file);
      this.offerLetterSubject.next({ uploaded: true, fileName: file.name, fileUrl });

      const payload = {
        offerLetter_PlacementStudent_Document: {
          uploaded: true,
          fileName: file.name,
          fileSize: file.size,
          fileUrl: fileUrl
        }
      };
      this.http.put(`${environment.baseUrl}/placements-app/update-student/${this.currentStudentId}`, payload).subscribe(() => {
        this.toastService.success('Offer letter successfully saved!');
      });
    }
  }

  public confirmRemoveOfferLetter(): void {
    this.showRemoveOfferModal = true;
  }

  public closeRemoveOfferLetterConfirm(): void {
    this.showRemoveOfferModal = false;
  }

  public removeOfferLetter(): void {
    this.offerLetterSubject.next({ uploaded: false, fileName: null, fileUrl: null });
    this.showRemoveOfferModal = false;
    const fileInput = document.getElementById('dashboard-offer-letter-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }

    const payload = {
      offerLetter_PlacementStudent_Document: {
        uploaded: false,
        fileName: null,
        fileSize: null,
        fileUrl: null
      }
    };
    this.http.put(`${environment.baseUrl}/placements-app/update-student/${this.currentStudentId}`, payload).subscribe(() => {
      this.toastService.success('Offer letter removed!');
    });
  }

  public goToAllDrives(): void {
    this.router.navigate(['../drives'], { relativeTo: this.route });
  }

  public switchStudent(studentId: string): void {
    // No-op for student UI
  }

  // --- EDIT PROFILE MODAL ACTIONS ---
  public closeEditProfile(): void {
    this.profileModalOpenSubject.next(false);
    if (this.profileSubject.value) {
      this.editForm = { ...this.profileSubject.value };
    }
  }

  public addInternship(): void {
    if (!this.editForm.internshipDetails) {
      this.editForm.internshipDetails = [];
    }
    this.editForm.internshipDetails.push({ companyName: '', location: '', jobType: 'Work from Office', duration: '' });
  }

  public removeInternship(index: number): void {
    if (this.editForm.internshipDetails) {
      this.editForm.internshipDetails.splice(index, 1);
    }
  }

  public saveProfile(): void {
    const payload = {
      rollNo_PlacementStudent_Text: this.editForm.rollNo,
      firstName_PlacementStudent_Text: this.editForm.firstName,
      lastName_PlacementStudent_Text: this.editForm.lastName,
      gender_PlacementStudent_Text: this.editForm.gender,
      dob_PlacementStudent_Date: this.editForm.dob,
      section_PlacementStudent_Text: this.editForm.section,
      specialization_PlacementStudent_Text: this.editForm.course || this.editForm.specialization,
      departmentName_PlacementStudent_Text: this.editForm.departmentName,
      email_PlacementStudent_Text: this.editForm.email,
      batchCode_PlacementStudent_Text: this.editForm.batchCode,
      backlogs_PlacementStudent_Int: this.editForm.backlogs,
      active_PlacementStudent_Bool: this.editForm.active,
      freeze_PlacementStudent_Bool: this.editForm.freeze,
      optedIn_PlacementStudent_Bool: this.editForm.optedIn || this.editForm.placementOptIn,
      cgpa_PlacementStudent_Double: this.editForm.cgpa ? parseFloat(this.editForm.cgpa) : 0,
      phone_PlacementStudent_Long: this.editForm.phone ? parseInt(this.editForm.phone.toString(), 10) : null,
      linkedin_PlacementStudent_Text: this.editForm.linkedin,
      github_PlacementStudent_Text: this.editForm.github,
      skills_PlacementStudent_Text: this.editForm.skills,
      studentAchievements_PlacementStudent_Text: this.editForm.achievements,
      projects_PlacementStudent_Text: this.editForm.projects,
      internshipDetails_PlacementStudent_DocumentArray: this.editForm.internshipDetails?.map(internship => ({
        companyName_PlacementStudent_Text: internship.companyName,
        location_PlacementStudent_Text: internship.location,
        jobType_PlacementStudent_Text: internship.jobType,
        duration_PlacementStudent_Text: internship.duration
      })) || [],
      studentResume_PlacementStudent_Text: this.editForm.resumeFileName || null
    };

    this.http.put(`${environment.baseUrl}/placements-app/update-student/${this.currentStudentId}`, payload).subscribe(() => {
      const current = this.profileSubject.value;
      if (current) {
        this.profileSubject.next({ ...current, ...this.editForm });
      }
      this.profileModalOpenSubject.next(false);
      this.toastService.success('Profile saved successfully!');
    });
  }

  // --- RESUME UPLOADS IN PROFILE MODAL ---
  public handleResumeFileSelect(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      this.uploadResumeFile(fileList[0]);
    }
  }

  public onResumeDragOver(event: DragEvent): void {
    event.preventDefault();
    this.resumeDragOver = true;
  }

  public onResumeDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.resumeDragOver = false;
  }

  public onResumeDrop(event: DragEvent): void {
    event.preventDefault();
    this.resumeDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.uploadResumeFile(files[0]);
    }
  }

  private uploadResumeFile(file: File): void {
    if (file.type !== 'application/pdf') {
      this.toastService.success('Please upload a PDF file.');
      return;
    }
    const size = file.size > 1024 * 1024
      ? (file.size / 1024 / 1024).toFixed(1) + ' MB'
      : (file.size / 1024).toFixed(0) + ' KB';

    const current = this.profileSubject.value;
    if (current) {
      this.profileSubject.next({ ...current, resumeUploaded: true, resumeFileName: file.name, resumeFileSize: size });
      this.editForm = { ...this.editForm, resumeUploaded: true, resumeFileName: file.name, resumeFileSize: size };
      this.toastService.success('Resume uploaded successfully!');
    }
  }

  public confirmRemoveResume(): void {
    this.showRemoveResumeModal = true;
  }

  public closeRemoveResumeConfirm(): void {
    this.showRemoveResumeModal = false;
  }

  public removeResume(): void {
    const current = this.profileSubject.value;
    if (current) {
      this.profileSubject.next({ ...current, resumeUploaded: false, resumeFileName: null, resumeFileSize: null, resumeUrl: null });
      this.editForm = { ...this.editForm, resumeUploaded: false, resumeFileName: null, resumeFileSize: null, resumeUrl: null };
    }
    this.showRemoveResumeModal = false;
    const fileInput = document.getElementById('resume-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    this.toastService.success('Resume removed successfully.');
  }

  public autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  // --- REGISTRATION FORM ACTIONS ---
  public handleOptingForChange(event: any): void {
    const optingFor = event.target.value;
    if (optingFor === 'placement') {
      this.totalSteps = 3;
    } else {
      this.totalSteps = 1;
    }
  }

  public nextStep(): void {
    const optingForElement = document.getElementById('optingFor') as HTMLSelectElement;
    if (this.currentStep === 1 && optingForElement && !optingForElement.value) {
      this.toastService.error('Please select your placement preference.');
      return;
    }

    if (optingForElement && optingForElement.value !== 'placement' && this.currentStep === 1) {
      this.submitForm();
      return;
    }

    if (this.currentStep === this.totalSteps) {
      this.submitForm();
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  public prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  public toggleBacklogs(event: any): void {
    const val = event.target.value;
    const countInput = document.getElementById('degreeBacklogsCount') as HTMLInputElement;
    if (countInput) {
      if (val === 'yes') {
        countInput.disabled = false;
        countInput.required = true;
      } else {
        countInput.disabled = true;
        countInput.required = false;
        countInput.value = '';
      }
    }
  }

  public togglePGBacklogs(event: any): void {
    const val = event.target.value;
    const countInput = document.getElementById('pgBacklogsCount') as HTMLInputElement;
    if (countInput) {
      if (val === 'yes') {
        countInput.disabled = false;
        countInput.required = true;
      } else {
        countInput.disabled = true;
        countInput.required = false;
        countInput.value = '';
      }
    }
  }

  public toggleExperience(event: any): void {
    const val = event.target.value;
    const expGroup = document.getElementById('experienceDetailsGroup');
    if (expGroup) {
      const inputs = expGroup.querySelectorAll('input');
      if (val === 'yes') {
        expGroup.style.display = 'grid'; // Changed to grid as per tailwind grid-cols
        inputs.forEach(i => i.required = true);
      } else {
        expGroup.style.display = 'none';
        inputs.forEach(i => {
          i.required = false;
          i.value = '';
        });
      }
    }
  }

  public onDeclarationFileChange(file: File | null): void {
    if (file) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const fileUrl = URL.createObjectURL(file);
        this.registrationForm.declarationFile = {
          uploaded: true,
          fileName: file.name,
          fileSize: file.size,
          fileUrl: fileUrl
        };
        this.toastService.success(`Signed Declaration "${file.name}" uploaded successfully!`);
      } else {
        this.toastService.error('Only PDF files are allowed.');
      }
    } else {
      this.registrationForm.declarationFile = null;
    }
  }

  public onResumeFileChange(file: File | null): void {
    if (file) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const fileUrl = URL.createObjectURL(file);
        this.registrationForm.resumeFile = {
          uploaded: true,
          fileName: file.name,
          fileSize: file.size,
          fileUrl: fileUrl
        };
        this.toastService.success(`Resume "${file.name}" uploaded successfully!`);
      } else {
        this.toastService.error('Only PDF files are allowed. Please upload a .pdf file.');
      }
    } else {
      this.registrationForm.resumeFile = null;
    }
  }

  public handleDeclarationUpload(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'application/pdf') {
        const fileUrl = URL.createObjectURL(file);
        this.registrationForm.declarationFile = {
          uploaded: true,
          fileName: file.name,
          fileSize: file.size,
          fileUrl: fileUrl
        };
        this.toastService.success(`Signed Declaration "${file.name}" uploaded successfully!`);
      } else {
        this.toastService.error('Only PDF files are allowed.');
        event.target.value = '';
      }
    }
  }

  public handleFormResumeUpload(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (['.pdf', '.doc', '.docx'].includes(extension)) {
        const fileUrl = URL.createObjectURL(file);
        this.registrationForm.resumeFile = {
          resumeUploaded: true,
          resumeFileName: file.name,
          resumeFileSize: file.size,
          resumeUrl: fileUrl
        };
        this.toastService.success(`Resume "${file.name}" uploaded successfully!`);
      } else {
        this.toastService.error('Only PDF or Word documents are allowed.');
        event.target.value = '';
      }
    }
  }

  public submitForm(): void {
    if (this.registrationForm.optingFor === 'placement' && (!this.registrationForm.termsGuidelines || !this.registrationForm.termsAccuracy || !this.registrationForm.termsAttendance || !this.registrationForm.termsDisqualification || !this.registrationForm.willAdhereCecr)) {
      this.toastService.error('Please agree to all terms and conditions.');
      return;
    }

    const optedInVal = this.registrationForm.optingFor === 'placement' ? 'opted_in' : 'opted_out';

    const isPlacement = this.registrationForm.optingFor === 'placement';

    const payload = {
      optInStatus: optedInVal,
      optedIn_PlacementStudent_Bool: isPlacement,
      email_PlacementStudent_Text: this.registrationForm.personalEmail,
      phone_PlacementStudent_Long: this.registrationForm.mobileNumber ? parseInt(this.registrationForm.mobileNumber, 10) : null,
      altPhone_PlacementStudent_Long: this.registrationForm.altMobileNumber ? parseInt(this.registrationForm.altMobileNumber, 10) : null,
      panCard_PlacementStudent_Text: this.registrationForm.panCard,
      aadhar_PlacementStudent_Long: this.registrationForm.aadharCard ? parseInt(this.registrationForm.aadharCard, 10) : null,
      drivingLicense_PlacementStudent_Text: this.registrationForm.drivingLicense,
      bloodGroup_PlacementStudent_Text: this.registrationForm.bloodGroup,
      fatherName_PlacementStudent_Text: this.registrationForm.fatherName,
      fatherOccupation_PlacementStudent_Text: this.registrationForm.fatherOccupation,
      presentAddress_PlacementStudent_Text: this.registrationForm.presentAddress,
      permanentAddress_PlacementStudent_Text: this.registrationForm.permanentAddress,
      tenthInstitution_PlacementStudent_Text: this.registrationForm.sslcInstitution,
      tenthLocation_PlacementStudent_Text: this.registrationForm.sslcLocation,
      tenthPer_PlacementStudent_Double: this.registrationForm.sslcPercentage ? parseFloat(this.registrationForm.sslcPercentage) : null,
      twelfthInstitution_PlacementStudent_Text: this.registrationForm.puInstitution,
      twelfthLocation_PlacementStudent_Text: this.registrationForm.puLocation,
      twelthPer_PlacementStudent_Double: this.registrationForm.puPercentage ? parseFloat(this.registrationForm.puPercentage) : null,
      degreeInstitution_PlacementStudent_Text: this.registrationForm.degreeInstitution,
      cgpa_PlacementStudent_Double: this.registrationForm.degreePercentage ? parseFloat(this.registrationForm.degreePercentage) : null,
      backlogs_PlacementStudent_Int: this.registrationForm.degreeBacklogs === 'yes' ? (this.registrationForm.degreeBacklogsCount ? parseInt(this.registrationForm.degreeBacklogsCount, 10) : 0) : 0,
      pgInstitution_PlacementStudent_Text: this.registrationForm.pgInstitution,
      pgPer_PlacementStudent_Double: this.registrationForm.pgPercentage ? parseFloat(this.registrationForm.pgPercentage) : null,
      pgBacklogs_PlacementStudent_Text: this.registrationForm.pgBacklogs === 'yes' ? (this.registrationForm.pgBacklogsCount ? this.registrationForm.pgBacklogsCount.toString() : '0') : '0',
      attendance_PlacementStudent_Text: this.registrationForm.attendancePercentage ? this.registrationForm.attendancePercentage.toString() : null,
      hasExperience_PlacementStudent_Bool: this.registrationForm.hasExperience === 'yes',
      internshipDetails_PlacementStudent_DocumentArray: this.registrationForm.hasExperience === 'yes' ? [
        {
          companyName_PlacementStudent_Text: this.registrationForm.experienceCompany || null,
          duration_PlacementStudent_Text: this.registrationForm.experienceMonths ? this.registrationForm.experienceMonths.toString() + ' months' : null,
          location_PlacementStudent_Text: null
        }
      ] : [],
      declaration_PlacementStudent_Text: this.registrationForm.declarationFile?.fileName || null,
      studentResume_PlacementStudent_Text: this.registrationForm.resumeFile?.resumeFileName || this.registrationForm.resumeFile?.fileName || null
    };

    this.http.put(`${environment.baseUrl}/placements-app/update-student/${this.currentStudentId}`, payload).subscribe({
      next: () => {
        this.toastService.success('Registration submitted successfully!');
        this.showSuccessModal = true;

        const current = this.profileSubject.value;
        if (current) {
          this.profileSubject.next({ ...current, optedInStatus: optedInVal, optedIn: optedInVal === 'opted_in' });
        }
      },
      error: (err) => {
        console.error('Failed to submit registration:', err);
        this.toastService.error('Failed to submit registration.');
      }
    });
  }

  public closeModal(): void {
    this.showSuccessModal = false;
    this.currentStep = 1;
    this.totalSteps = 1;
    const optingFor = document.getElementById('optingFor') as HTMLSelectElement;
    if (optingFor) optingFor.value = '';
    const form = document.getElementById('wizardForm') as HTMLFormElement;
    if (form) form.reset();
  }

  public getNextButtonText(): string {
    const optingFor = document.getElementById('optingFor') as HTMLSelectElement;
    const val = optingFor ? optingFor.value : '';
    if (val && val !== 'placement' && this.currentStep === 1) {
      return 'Submit Registration';
    } else if (val === 'placement') {
      return this.currentStep === this.totalSteps ? 'Submit Registration' : 'Next →';
    } else {
      return 'Next →';
    }
  }
}
