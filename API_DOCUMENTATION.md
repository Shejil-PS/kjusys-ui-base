

  
2. COMPANY MANAGEMENT SERVICE
  
     API: /kjusys-api/placements-app/list-companies

    GET
   
  Fetches a list of all registered placement companies.
Parameters:
  - Query Parameter:
      * search (Optional, String) : Search term to filter companies by name, code, or industry.

-----------------------------------------------------------------------------------------------------------


     API: /kjusys-api/placements-app/create-company
    POST
   
  Creates a new company entry in the placement system.
Parameters:
  - Request Body (JSON):
      * companyName_PlacementCompany_Text       (Required, String)  : Name of the company
      * industry_PlacementCompany_Text          (Required, String)  : Industry sector/domain
      * contactPerson_PlacementCompany_Text     (Required, String)  : Contact person name
      * companyCode_PlacementCompany_Text       (Optional, String)  : Company code
      * contactPersonEmail_PlacementCompany_Text(Optional, String)  : Contact email
      * contactPersonPhone_PlacementCompany_Long (Optional, Long)    : Contact phone number
      * companyAddress_PlacementCompany_Text    (Optional, String)  : Office address


-----------------------------------------------------------------------------------------------------------


     API: /kjusys-api/placements-app/get-company/:id
    GET
   
  Retrieves complete details of a specific company by company ID.
Parameters:
  - Path Parameter:
      * id (Required, String) : Unique identifier of the company.


-----------------------------------------------------------------------------------------------------------


     API: /kjusys-api/placements-app/update-company/:id
    PUT
   
  Updates existing company details by company ID.
Parameters:
  - Path Parameter:
      * id (Required, String) : Company ID to update.
  - Request Body (JSON):
      * Fields to update (e.g. companyName, industry, contact details, address).

-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/delete-company/:id
    DELETE
   
  Deletes a company record from the placement system.
Parameters:
  - Path Parameter:
      * id (Required, String) : Company ID to delete.
-----------------------------------------------------------------------------------------------------------
  
3. STUDENT MANAGEMENT SERVICE
  
     



     API: /kjusys-api/placements-app/list-students
    GET
   
  Retrieves a list of all registered students with optional search filter.
Parameters:
  - Query Parameter:
      * search (Optional, String) : Search filter matching name, roll number, department, or email.

-----------------------------------------------------------------------------------------------------------


     API: /kjusys-api/placements-app/get-student/:id
    GET
   
  Retrieves full profile details for a specific student.
Parameters:
  - Path Parameter:
      * id (Required, String) : Student ID.


-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/update-student/:id
    PUT
   
  Updates profile or academic information of an existing student.
Parameters:
  - Path Parameter:
      * id (Required, String) : Student ID.
  - Request Body (JSON):
      * Student fields to update (CGPA, backlogs, contact details, resume link, LinkedIn , GitHub,   etc.).

-----------------------------------------------------------------------------------------------------------


     API: /kjusys-api/placements-app/delete-student/:id
    DELETE
   
  Deletes a student record from the database.
Parameters:
  - Path Parameter:
      * id (Required, String) : Student ID.

  -----------------------------------------------------------------------------------------------------------
4. BATCH MANAGEMENT SERVICE
  
    




     API: /kjusys-api/placements-app/list-batches
    GET
   
  Lists all academic batches in the system.
Parameters:
  - Query Parameter:
      * search (Optional, String) : Search term to filter batches.

-----------------------------------------------------------------------------------------------------------


     API: /kjusys-api/placements-app/get-batch/:id
    GET
   
  Retrieves details of a specific batch by ID.
Parameters:
  - Path Parameter:
      * id (Required, String) : Batch ID.

-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/update-batch/:id
    PUT
   
  Updates details of an existing batch.
Parameters:
  - Path Parameter:
      * id (Required, String) : Batch ID.
  - Request Body (JSON):
      * Batch fields to update (`batchCode`, `batchName`, `departmentName`).

-----------------------------------------------------------------------------------------------------------


     API: /kjusys-api/placements-app/delete-batch/:id
    DELETE
   
  Deletes a batch entry.
Parameters:
  - Path Parameter:
      * id (Required, String) : Batch ID.
-----------------------------------------------------------------------------------------------------------
  
5. APPLICATION MANAGEMENT SERVICE
  
     API: /kjusys-api/placements-app/create-applications
    POST
   
  Submits a job application for a student for a specific placement job drive.
Parameters:
  - Request Body (JSON):
      * studentId_PlacementAppilcation_Text     (Required, String) : Student ID
      * rollNo_PlacementAppilcation_Text        (Required, String) : Roll Number
      * studentName_PlacementAppilcation_Text   (Required, String) : Student Name
      * placementId_PlacementAppilcation_Text   (Required, String) : Placement Drive ID
      * jobId_PlacementAppilcation_Text         (Required, String) : Job Opening ID
      * companyCode_PlacementAppilcation_Text   (Required, String) : Company Code
      * companyName_PlacementAppilcation_Text   (Required, String) : Company Name
      * appiliedDate_PlacementAppilcation_Date  (Required, Long)   : Date timestamp of application
      * resumeUrl_PlacementAppilcation_Document (Optional, Object) : Resume document reference
      * formAnswers_PlacementAppilcation_DocumentArray (Optional, Array) : Custom form responses
      * status_PlacementAppilcation_Text        (Optional, String) : Initial status (Default: APPLIED)


-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/list-applications
    GET
   
  Retrieves job applications with optional filter criteria.
Parameters:
  - Query Parameters:
      * placementId (Optional, String) : Filter by Placement Drive ID
      * jobId       (Optional, String) : Filter by Job ID
      * companyId   (Optional, String) : Filter by Company ID
      * studentId   (Optional, String) : Filter by Student ID
      * status      (Optional, String) : Filter by Application Status
      * search      (Optional, String) : Search keyword


-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/applications/export
    GET
   
  Exports job applications for a placement drive into CSV or JSON format.
Parameters:
  - Query Parameters:
      * placementId (Required, String) : Placement Drive ID to export
      * jobId       (Optional, String) : Filter by specific Job ID
      * status      (Optional, String) : Filter by application status
      * format      (Optional, String) : Export format: "csv" (default) or "json"

-----------------------------------------------------------------------------------------------------------


     API: /kjusys-api/placements-app/applications/:applicationId
    GET
   
  Retrieves full application details by Application ID.
Parameters:
  - Path Parameter:
      * applicationId (Required, String) : Application ID.


-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/applications/:applicationId/status
    PATCH
   
  Updates the status of a student's job application (e.g. APPLIED, SHORTLISTED, SELECTED, REJECTED).
Parameters:
  - Path Parameter:
      * applicationId (Required, String) : Application ID.
  - Request Body (JSON):
      * status (Required, String) : New status string.

  -----------------------------------------------------------------------------------------------------------
6. PLACEMENT DRIVE MANAGEMENT SERVICE
  
     API: /kjusys-api/placements-app/placements
    GET
   
  Lists all placement drives with optional search keyword.
Parameters:
  - Query Parameter:
      * search (Optional, String) : Search keyword.


-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/create-placements
    POST
   
  Creates a new placement drive for a company.
Parameters:
  - Request Body (JSON):
      * companyId_PlacementDrive_Text    (Required, String) : Company ID
      * companyCode_PlacementDrive_Text  (Optional, String) : Company Code
      * companyName_PlacementDrive_Text  (Optional, String) : Company Name
      * batchCode_PlacementDrive_Text    (Optional, String) : Target Batch Code
      * driveStart_PlacementDrive_Date   (Optional, Long)   : Drive Start Date timestamp
      * driveEnd_PlacementDrive_Date     (Optional, Long)   : Drive End Date timestamp
      * jobs_PlacementDrive_DocumentArray(Optional, Array)  : Array of job openings under drive


-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/placements/:placementId
    GET
   
  Retrieves details of a specific placement drive by placementId.
Parameters:
  - Path Parameter:
      * placementId (Required, String) : Placement Drive ID.


-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/update-placements/:placementId
    PUT
   
  Updates information of an existing placement drive.
Parameters:
  - Path Parameter:
      * placementId (Required, String) : Placement Drive ID.
  - Request Body (JSON):
      * Placement drive fields to update.

-----------------------------------------------------------------------------------------------------------


     API: /kjusys-api/placements-app/delete-placements/:placementId
    DELETE
   
  Deletes a placement drive.
Parameters:
  - Path Parameter:
      * placementId (Required, String) : Placement Drive ID.


-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/placements/:placementId/jobs
    POST
   
  Adds a new job opening/role to a placement drive.
Parameters:
  - Path Parameter:
      * placementId (Required, String) : Placement Drive ID.
  - Request Body (JSON):
      * companyId_PlacementDrive_Text       (Required, String) : Company ID
      * role_PlacementDrive_Text            (Required, String) : Job Role / Title
      * employmentType_PlacementDrive_Text  (Required, String) : Employment Type (Full Time / Internship / Part Time)
      * description_PlacementDrive_Text     (Optional, String) : Job Description
      * packageLpa_PlacementDrive_Text      (Optional, String) : CTC Package in LPA
      * minCgpa_PlacementDrive_Double       (Optional, Double) : Minimum CGPA requirement
      * allowBacklog_PlacementDrive_Bool    (Optional, Boolean): Backlog eligibility flag
      * eligibleBatches_PlacementDrive_TextArray (Optional, Array): List of eligible batch codes

-----------------------------------------------------------------------------------------------------------


     API: /kjusys-api/placements-app/placements/:placementId/jobs/:jobId
    PUT
   
  Updates details of a specific job role in a placement drive.
Parameters:
  - Path Parameters:
      * placementId (Required, String) : Placement Drive ID
      * jobId       (Required, String) : Job ID
  - Request Body (JSON):
      * Job fields to update.

-----------------------------------------------------------------------------------------------------------


     API: /kjusys-api/placements-app/placements/:placementId/jobs/:jobId
    DELETE
   
  Deletes a job opening from a placement drive.
Parameters:
  - Path Parameters:
      * placementId (Required, String) : Placement Drive ID
      * jobId       (Required, String) : Job ID


-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/placements/:placementId/jobs/:jobId/fields
    POST
   
  Adds a custom dynamic question/field to a job application form.
Parameters:
  - Path Parameters:
      * placementId (Required, String) : Placement Drive ID
      * jobId       (Required, String) : Job ID
  - Request Body (JSON):
      * label_PlacementDrive_Text     (Required, String)  : Field Label / Question
      * fieldType_PlacementDrive_Text (Required, String)  : Field Type (text, select, radio, file, etc.)
      * required_PlacementDrive_Bool  (Optional, Boolean) : Mandatory flag


-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/placements/:placementId/jobs/:jobId/fields/:fieldId
    PUT
   
  Updates an existing custom question/field in a job application form.
Parameters:
  - Path Parameters:
      * placementId (Required, String) : Placement Drive ID
      * jobId       (Required, String) : Job ID
      * fieldId     (Required, String) : Custom Field ID
  - Request Body (JSON):
      * Custom field properties to update.

-----------------------------------------------------------------------------------------------------------


     API: /kjusys-api/placements-app/placements/:placementId/jobs/:jobId/fields/:fieldId
    DELETE
   
  Deletes a custom application field from a job opening.
Parameters:
  - Path Parameters:
      * placementId (Required, String) : Placement Drive ID
      * jobId       (Required, String) : Job ID
      * fieldId     (Required, String) : Custom Field ID
-----------------------------------------------------------------------------------------------------------
  
7. DASHBOARD & ANALYTICS SERVICE
  
     API: /kjusys-api/placements-app/dashboard/summary
    GET
   
  Provides high-level dashboard metrics (total companies, total students, placement counts, total drives).
Parameters: 
  None


-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/dashboard/placement-stats
    GET
   
  Provides statistical metrics of placements grouped by batch, department, or company.
Parameters: 
  None

-----------------------------------------------------------------------------------------------------------


     API: /kjusys-api/placements-app/dashboard/recent-applications
    GET
   
  Retrieves recent student job application activities and status changes.
Parameters: 
  None
-----------------------------------------------------------------------------------------------------------
  
8. DECLARATION MANAGEMENT SERVICE
  
     API: /kjusys-api/placements-app/create-declaration
    POST
   
  Creates a new placement declaration form template.
Parameters:
  - Request Body (JSON):
      * declarationForm_PlacementDeclare_Text (Required, String) : Declaration form content / template text
      * academicYear_PlacementDeclare_Text    (Optional, String) : Academic Year

-----------------------------------------------------------------------------------------------------------


     API: /kjusys-api/placements-app/list-declarations
    GET
   
  Lists all created declaration form templates.
Parameters: 
  None

-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/get-declaration/:id
    GET
   
  Fetches details of a declaration form by ID.
Parameters:
  - Path Parameter:
      * id (Required, String) : Declaration ID.

-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/update-declaration/:id
    PUT
   
  Updates an existing declaration form template.
Parameters:
  - Path Parameter:
      * id (Required, String) : Declaration ID.
  - Request Body (JSON):
      * Declaration fields to update.


-----------------------------------------------------------------------------------------------------------

     API: /kjusys-api/placements-app/delete-declaration/:id
    DELETE
   
  Deletes a declaration form template.
Parameters:
  - Path Parameter:
      * id (Required, String) : Declaration ID.
================================================================================
