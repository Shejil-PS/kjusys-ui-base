import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  declarationId = '6a328fc07108b70d2b0c884a';
  declarationPath = '';
  isUpdating = false;
  selectedFile: File | null = null;
  selectedFileName = '';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.fetchDeclaration();
  }

  fetchDeclaration(): void {
    this.http.get<any>(`${environment.baseUrl}/placements-app/get-declaration/${this.declarationId}`).subscribe({
      next: (res) => {
        const data = res?.responseData?.data || res?.responseData || res?.data || res;
        if (data && data.declarationForm_PlacementDeclare_Text) {
          this.declarationPath = data.declarationForm_PlacementDeclare_Text;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error fetching declaration', err)
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;
      this.cdr.detectChanges();
    }
  }

  updateDeclaration(): void {
    if (!this.selectedFile) return;
    this.isUpdating = true;
    
    const reader = new FileReader();
    reader.readAsDataURL(this.selectedFile);
    reader.onload = () => {
      const base64String = reader.result as string;
      const payload = {
        declarationForm_PlacementDeclare_Text: base64String
      };
      
      this.http.put<any>(`${environment.baseUrl}/placements-app/update-declaration/${this.declarationId}`, payload).subscribe({
        next: (res) => {
          this.isUpdating = false;
          alert('Declaration form updated successfully');
          this.fetchDeclaration();
          this.selectedFile = null;
          this.selectedFileName = '';
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isUpdating = false;
          this.cdr.detectChanges();
          const errorMsg = err.error?.message || err.message || 'Unknown error';
          alert(`Failed to update declaration form. Status: ${err.status}. Error: ${errorMsg}`);
          console.error('Update failed:', err);
        }
      });
    };
    reader.onerror = (error) => {
      this.isUpdating = false;
      this.cdr.detectChanges();
      alert('Failed to read file');
      console.error('File read error:', error);
    };
  }

  getDisplayFileName(): string {
    if (!this.declarationPath) return '';
    if (this.declarationPath.startsWith('data:')) {
      const mime = this.declarationPath.split(';')[0].split(':')[1];
      let ext = 'file';
      if (mime === 'application/pdf') ext = 'pdf';
      else if (mime === 'application/msword') ext = 'doc';
      else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') ext = 'docx';
      return `Uploaded_Declaration_Form.${ext}`;
    }
    // Fallback for regular URLs or paths
    return this.declarationPath.split(/[/\\]/).pop() || 'Declaration_Form_File';
  }
}
