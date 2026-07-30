import { Component, OnInit } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Application, mapBackendToApplication, extractDataArray, mapBackendToDrives, Drive } from '../dashboard-student.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-applications-page',
  templateUrl: './applications-page.component.html'
})
export class ApplicationsPageComponent implements OnInit {
  private applicationsSubject = new BehaviorSubject<Application[]>([]);
  public applications$: Observable<Application[]> = this.applicationsSubject.asObservable();
  public isLoading: boolean = true;
  private currentStudentId = '6a2b80a72cfa1b3892b73336';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.isLoading = true;
    const apps$ = this.http.get<any[]>(`${environment.baseUrl}/placements-app/list-applications`).pipe(catchError(() => of([])));
    const drives$ = this.http.get<any[]>(`${environment.baseUrl}/placements-app/placements`).pipe(catchError(() => of([])));

    combineLatest([apps$, drives$]).subscribe(([apps, placements]) => {
      let allDrives: Drive[] = [];
      const placementsList = extractDataArray(placements);
      if (placementsList && placementsList.length > 0) {
        placementsList.forEach((p: any) => {
          allDrives = allDrives.concat(mapBackendToDrives(p));
        });
      }

      const appsList = extractDataArray(apps);
      const userApps = appsList.map(a => mapBackendToApplication(a)).filter((a: Application) => String(a.studentId).toLowerCase() === String(this.currentStudentId).toLowerCase());

      userApps.forEach(app => {
        const linkedDrive = allDrives.find(d => String(d.jobId) === String(app.jobId) || String(d.placementId) === String(app.placementId));
        if (linkedDrive) {
          app.title = linkedDrive.title || app.title;
          app.lpa = linkedDrive.lpa || app.lpa;
          app.company = linkedDrive.company || app.company;
        }
      });

      this.applicationsSubject.next(userApps);
      this.isLoading = false;
    });
  }
}
