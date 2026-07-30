import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { Observable, combineLatest, BehaviorSubject, of } from 'rxjs';
import { map, filter, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { SharedToastService } from '@libs/shared-toast';
import { environment } from '../../../environments/environment';
import { Profile, Drive, Application, FormAnswer, mapBackendToProfile, mapBackendToDrives, mapBackendToApplication, extractDataArray, checkEligibility } from '../dashboard-student/dashboard-student.component';
import { Breadcrumb } from '@libs/shared-ui';

@Component({
  selector: 'app-drives-student',
  templateUrl: './drives-student.component.html',
  styleUrls: ['./drives-student.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class DrivesStudentComponent implements OnInit {
  public drives$: Observable<Drive[]>;
  public profile$: Observable<Profile>;
  public applications$: Observable<Application[]>;

  private profileSubject = new BehaviorSubject<Profile | null>(null);
  private drivesSubject = new BehaviorSubject<Drive[]>([]);
  private applicationsSubject = new BehaviorSubject<Application[]>([]);

  public activeView: 'list' | 'detail' = 'list';
  public selectedDrive: Drive | null = null;
  public searchQuery: string = '';
  public checkEligibility = checkEligibility;
  public isLoading = true;

  public evaluateDriveStatus(closeDateRaw: any, activeFlag?: boolean, rawStatus?: string): 'open' | 'closed' {
    if (activeFlag === false || rawStatus === 'closed' || rawStatus === 'Intake Closed') {
      return 'closed';
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

  // Apply Modal Wizard state
  public showApplyModal = false;
  public applyStep: 'type' | 'default-confirm' | 'upload' | 'upload-confirm' | 'questions' = 'type';
  public resumeSource: 'default' | 'upload' = 'default';

  public uploadedResumeFile: File | null = null;
  public uploadedResumeFileName = '';
  public uploadedResumeFileSize = '';

  public answeredQuestions: { [id: string]: any } = {};
  public currentQuestions: any[] = [];

  public driveBreadcrumbs: Breadcrumb[] = [
    { label: 'Placements' },
    { label: 'Drives' }
  ];

  public getDetailBreadcrumbs(drive: any): Breadcrumb[] {
    return [
      { label: 'Placements' },
      { label: 'Drives', callback: () => this.goBackToList() },
      { label: drive?.company || 'Drive Detail' }
    ];
  }

  private currentStudentId = '6a2b808f2cfa1b3892b73335';

  constructor(
    private http: HttpClient,
    private toastService: SharedToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.profile$ = this.profileSubject.asObservable().pipe(
      filter(p => p !== null),
      map(p => p as Profile)
    );
    this.drives$ = combineLatest([
      this.drivesSubject.asObservable(),
      this.profileSubject.asObservable(),
      this.applicationsSubject.asObservable()
    ]).pipe(
      map(([drives, profile, apps]) => {
        if (!profile) return [];
        return drives.filter(d => this.hasApplied(d, apps) || checkEligibility(d, profile).eligible);
      })
    );
    this.applications$ = this.applicationsSubject.asObservable();
  }

  ngOnInit(): void {
    // Fetch Profile
    this.http.get<any>(`${environment.baseUrl}/placements-app/get-student/${this.currentStudentId}`).pipe(
      map(data => mapBackendToProfile(data))
    ).subscribe(prof => {
      this.profileSubject.next(prof);
      this.cdr.detectChanges();
    });

    // Fetch Drives, Companies, and Batches
    const drives$ = this.http.get<any[]>(`${environment.baseUrl}/placements-app/placements`).pipe(catchError(() => of([])));
    const companies$ = this.http.get<any[]>(`${environment.baseUrl}/placements-app/list-companies`).pipe(catchError(() => of([])));
    const batches$ = this.http.get<any[]>(`${environment.baseUrl}/placements-app/list-batches`).pipe(catchError(() => of([])));

    combineLatest([drives$, companies$, batches$]).subscribe(([placements, companies, batches]) => {
      let allDrives: Drive[] = [];
      const placementsList = extractDataArray(placements);
      const companiesList = extractDataArray(companies);
      const batchesList = extractDataArray(batches);

      if (placementsList && placementsList.length > 0) {
        placementsList.forEach(p => {
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
      this.drivesSubject.next(allDrives);
      this.cdr.detectChanges();
    });

    // Fetch Applications
    this.http.get<any[]>(`${environment.baseUrl}/placements-app/list-applications`).subscribe(apps => {
      const appsList = extractDataArray(apps);
      const userApps = appsList.map(a => mapBackendToApplication(a)).filter((a: Application) => String(a.studentId).toLowerCase() === String(this.currentStudentId).toLowerCase());
      this.applicationsSubject.next(userApps);
      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }

  public getFilteredDrives(drives: Drive[] | null): Drive[] {
    if (!drives) return [];
    if (!this.searchQuery.trim()) return drives;
    const query = this.searchQuery.toLowerCase();
    return drives.filter(d =>
      d.company.toLowerCase().includes(query) ||
      d.title.toLowerCase().includes(query)
    );
  }

  public openDriveDetail(drive: Drive): void {
    this.selectedDrive = drive;
    this.activeView = 'detail';
  }

  public goBackToList(): void {
    this.activeView = 'list';
    this.selectedDrive = null;
  }

  // --- APPLY WIZARD ---
  public openApply(drive: Drive): void {
    this.selectedDrive = drive;
    this.showApplyModal = true;
    this.applyStep = 'type';
    this.uploadedResumeFile = null;
    this.uploadedResumeFileName = '';
    this.uploadedResumeFileSize = '';
    this.answeredQuestions = {};
    this.currentQuestions = this.getCompanyQuestions();
    document.body.style.overflow = 'hidden';
  }

  public closeApply(): void {
    this.showApplyModal = false;
    document.body.style.overflow = '';
  }

  public chooseResume(type: 'default' | 'upload'): void {
    this.resumeSource = type;
    if (type === 'default') {
      if (this.currentQuestions && this.currentQuestions.length > 0) {
        this.applyStep = 'questions';
      } else {
        this.applyStep = 'default-confirm';
      }
    } else {
      this.applyStep = 'upload';
    }
  }

  public goBackToStep1(): void {
    this.applyStep = 'type';
  }

  public getCompanyQuestions(): any[] {
    if (this.selectedDrive) {
      const sourceQuestions = this.selectedDrive.additionalQuestions || this.selectedDrive.fields || [];
      if (sourceQuestions.length > 0) {
        return sourceQuestions.map(q => {
          const rawType = (q.fieldType || (q as any).type || '').toLowerCase();
          let mappedType = 'text';
          if (rawType.includes('short text')) mappedType = 'text';
          else if (rawType.includes('long text')) mappedType = 'textarea';
          else if (rawType.includes('multiple choice')) mappedType = 'dropdown';
          else if (rawType.includes('checkbox') || rawType.includes('boolean')) mappedType = 'checkbox';
          else if (rawType.includes('number')) mappedType = 'number';

          return {
            id: q.fieldId || (q as any).id,
            type: mappedType,
            label: q.label,
            required: q.required,
            options: q.options
          };
        });
      }
    }
    return [];
  }

  public handleApplyFileSelect(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      this.showApplyFilePreview(file);
    }
  }

  public showApplyFilePreview(file: File): void {
    if (!this.selectedDrive || !this.profileSubject.value) return;
    if (!checkEligibility(this.selectedDrive, this.profileSubject.value).eligible) {
      alert('You are no longer eligible to apply for this drive.');
      return;
    }
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }
    this.uploadedResumeFile = file;
    this.uploadedResumeFileName = file.name;
    const size = file.size > 1024 * 1024
      ? (file.size / 1024 / 1024).toFixed(1) + ' MB'
      : (file.size / 1024).toFixed(0) + ' KB';
    this.uploadedResumeFileSize = size;
  }

  public clearApplyFile(): void {
    this.uploadedResumeFile = null;
    this.uploadedResumeFileName = '';
    this.uploadedResumeFileSize = '';
    const fileInput = document.getElementById('apply-resume-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  public proceedFromUpload(): void {
    if (!this.uploadedResumeFile) return;
    if (this.currentQuestions && this.currentQuestions.length > 0) {
      this.applyStep = 'questions';
    } else {
      this.applyStep = 'upload-confirm';
    }
  }

  public goBackFromQuestions(): void {
    if (this.resumeSource === 'default') {
      this.applyStep = 'type';
    } else {
      this.applyStep = 'upload';
    }
  }

  public proceedFromQuestions(): void {
    for (let q of this.currentQuestions) {
      const answer = this.answeredQuestions[q.id];
      if (q.required) {
        if (q.type === 'checkbox') {
          if (!answer) {
            alert(`Please check the required option: "${q.label}"`);
            return;
          }
        } else {
          if (!answer || !answer.trim()) {
            alert(`Please answer the required question: "${q.label}"`);
            return;
          }
        }
      }
    }
    if (this.resumeSource === 'default') {
      this.applyStep = 'default-confirm';
    } else {
      this.applyStep = 'upload-confirm';
    }
  }

  public hasApplied(drive: Drive, applications: Application[] | null): boolean {
    if (!applications) return false;
    return applications.some(app =>
      app.jobId === drive.jobId ||
      (app.company.toLowerCase() === drive.company.toLowerCase() &&
        app.title.toLowerCase() === drive.title.toLowerCase())
    );
  }

  public submitApplication(): void {
    if (!this.selectedDrive) return;
    const formAnswers: FormAnswer[] = Object.keys(this.answeredQuestions).map(key => ({
      answerId: 'ANS' + Math.floor(Math.random() * 100000),
      fieldId: key,
      answer: String(this.answeredQuestions[key])
    }));

    const profile = this.profileSubject.value;
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

    let resumeDocument: any = null;
    if (this.resumeSource === 'default' && profile && profile.resumeUploaded) {
      resumeDocument = {
        resumeUploaded: profile.resumeUploaded,
        resumeFileName: profile.resumeFileName,
        resumeFileSize: profile.resumeFileSize,
        resumeUrl: profile.resumeUrl
      };
    } else if (this.resumeSource === 'upload' && this.uploadedResumeFile) {
      resumeDocument = {
        resumeUploaded: true,
        resumeFileName: this.uploadedResumeFileName,
        resumeFileSize: this.uploadedResumeFileSize,
        resumeUrl: null
      };
    }

    const newApp: any = {
      // Mapped fields using ONLY the new keynames
      studentId_PlacementAppilcation_Text: this.currentStudentId,
      rollNo_PlacementAppilcation_Text: profile?.rollNo || '',
      studentName_PlacementAppilcation_Text: profile?.name || '',
      placementId_PlacementAppilcation_Text: this.selectedDrive.placementId,
      jobId_PlacementAppilcation_Text: this.selectedDrive.jobId,
      companyCode_PlacementAppilcation_Text: this.selectedDrive.companyId,
      companyName_PlacementAppilcation_Text: this.selectedDrive.company,
      appiliedDate_PlacementAppilcation_Date: formattedDate,
      status_PlacementAppilcation_Text: 'In Progress',
      resumeUrl_PlacementAppilcation_Document: resumeDocument,

      formAnswers_PlacementAppilcation_DocumentArray: formAnswers.map(f => ({
        answerId_PlacementAppilcation_Text: f.answerId,
        fieldId_PlacementAppilcation_Text: f.fieldId,
        answer_PlacementAppilcation_Text: f.answer
      }))
    };

    if (profile?.phone) newApp.phone_PlacementAppilcation_Long = Number(profile.phone);
    if (profile?.linkedin) newApp.linkedin_PlacementAppilcation_Text = profile.linkedin;
    if (profile?.github) newApp.github_PlacementAppilcation_Text = profile.github;
    if (profile?.skills) newApp.skills_PlacementAppilcation_Text = profile.skills;
    if (profile?.achievements) newApp.studentAchievements_PlacementAppilcation_Text = profile.achievements;
    if (profile?.projects) newApp.projects_PlacementAppilcation_Text = profile.projects;
    if (profile?.internshipDetails && profile.internshipDetails.length > 0) {
      newApp.internshipDetails_PlacementAppilcation_DocumentArray = profile.internshipDetails.map((i: any) => ({
        internCompanyName_PlacementAppilcation_Text: i.companyName,
        duration_PlacementAppilcation_Text: i.duration,
        location_PlacementAppilcation_Text: i.location,
        jobType_PlacementAppilcation_Text: i.jobType
      }));
    }

    console.log('--- Submitting Application ---');
    console.log('Profile State:', profile);
    console.log('Application Payload:', JSON.stringify(newApp, null, 2));

    this.http.post<any>(`${environment.baseUrl}/placements-app/create-applications`, newApp).subscribe(res => {
      // The Java backend always returns HTTP 200, but puts the actual status in the JSON body
      if (res && res.statusCode && res.statusCode !== 200 && res.statusCode !== 201) {
        let errorMsgs = res.responseData?.message || [];
        if (res.responseData?.data && Array.isArray(res.responseData.data) && res.responseData.data.length > 0) {
          const dataErrors = res.responseData.data.map((d: any) => `${d.property}: ${d.message || 'Invalid'}`);
          errorMsgs = [...errorMsgs, ...dataErrors];
        }
        if (errorMsgs.length === 0) errorMsgs = ['Failed to apply. Please check your details.'];

        this.toastService.error(errorMsgs.join(' | '));
        console.error('Backend rejected the application:', res);
        console.error('Validation errors:', res.responseData?.data);
        return;
      }

      this.toastService.success(`Applied to ${this.selectedDrive!.company} – ${this.selectedDrive!.title}!`);

      // Refresh applications list
      this.http.get<any[]>(`${environment.baseUrl}/placements-app/list-applications`).subscribe(apps => {
        const appsList = extractDataArray(apps);
        const userApps = appsList.map(a => mapBackendToApplication(a)).filter((a: Application) => String(a.studentId).toLowerCase() === String(this.currentStudentId).toLowerCase());
        this.applicationsSubject.next(userApps);
      });

      this.closeApply();
      this.goBackToList();
    });
  }
}
