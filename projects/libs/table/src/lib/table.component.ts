import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  ExportOption,
  FilterConfig,
  PaginationConfig,
  PrimaryAction,
  SecondaryAction,
  SecondaryActionEvent,
  StatusToggleEvent,
  TableColumn,
} from './table.models';

/**
 * @libs/table — TableComponent
 *
 * A fully-featured, reusable Angular 16 table component.
 *
 * ──────────────────────────────────────────────────────────
 * INPUTS
 * ──────────────────────────────────────────────────────────
 * columns            TableColumn[]       Column definitions (key, label, sortable, type)
 * data               any[]               Row data array
 * primaryActions     PrimaryAction[]     Which of view/edit/delete to show
 * secondaryActions   SecondaryAction[]   Custom SVG icon button actions
 * exportOptions      ExportOption[]      Single = plain btn; multiple = floating menu
 * filters            FilterConfig[]      Slide-in filter panel config
 * pagination         PaginationConfig    Current page state (from parent/API)
 * showSearch         boolean             Show search bar (default: true)
 * showDateRange      boolean             Show 1D/1W/1M/3M/6M/1Y quick links
 * showStatusToggle   boolean             Add STATUS column with toggle
 * statusKey          string              Row property key for the toggle boolean
 * searchPlaceholder  string              Placeholder text for search input
 * showCheckboxes     boolean             Bulk-select checkboxes
 * loading            boolean             Show loading skeleton
 *
 * ──────────────────────────────────────────────────────────
 * OUTPUTS
 * ──────────────────────────────────────────────────────────
 * onView(row)                       View primary action clicked
 * onEdit(row)                       Edit primary action clicked
 * onDelete(row)                     Delete primary action clicked
 * onSecondaryAction({key, row})     Custom secondary action clicked
 * onExport(key)                     Export option selected
 * onPageChange(page)                Pagination page clicked → parent calls API
 * onItemsPerPageChange(n)           Rows-per-page changed
 * onFilterApply(map)                Apply Filters clicked
 * onFilterClear()                   Clear Filters clicked
 * onStatusToggle({row, value})      Status toggle flipped
 * onSearch(query)                   Search text changed
 * onSort({key, direction})          Column sort clicked
 * onDateRangeSelect({start, end, range}) Quick date range link clicked or custom dates applied
 */
@Component({
  selector: 'lib-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.css'],
})
export class TableComponent implements OnInit, OnChanges {

  constructor(private eRef: ElementRef) {}

  // ─── Data Inputs ───────────────────────────────────────────────────────────

  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() clientPagination: boolean = false;

  get displayedData(): any[] {
    let output = this.data;

    // 1. Client-side Search Filter
    if (this.clientPagination && this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      output = output.filter(row => {
        return this.columns.some(col => {
          const val = row[col.key];
          return val != null && String(val).toLowerCase().includes(q);
        });
      });
    }

    // Update pagination metadata based on possibly filtered data
    if (this.clientPagination) {
      this.pagination.totalItems = output.length;
      this.pagination.totalPages = Math.ceil(output.length / this.pagination.itemsPerPage) || 1;
    }

    // 2. Client-side Sort
    if (this.clientPagination && this.sortKey) {
      output = [...output].sort((a, b) => {
        let valA = a[this.sortKey];
        let valB = b[this.sortKey];
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // 3. Client-side Page Slice
    if (this.clientPagination && this.pagination.itemsPerPage > 0) {
      const start = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage;
      const end = start + this.pagination.itemsPerPage;
      return output.slice(start, end);
    }

    return output;
  }

  get showEmptyState(): boolean {
    return !this.loading && this.displayedData.length === 0;
  }

  // ─── Action Inputs ─────────────────────────────────────────────────────────

  @Input() primaryActions: PrimaryAction[] = [];
  @Input() secondaryActions: SecondaryAction[] = [];
  @Input() bulkActions: PrimaryAction[] = [];

  // ─── Export Inputs ─────────────────────────────────────────────────────────

  /** Pass one or more export options. Single = plain button. Multiple = dropdown menu. */
  @Input() exportOptions: ExportOption[] = [];

  // ─── Filter Inputs ─────────────────────────────────────────────────────────

  @Input() filters: FilterConfig[] = [];

  // ─── Pagination Inputs ─────────────────────────────────────────────────────

  @Input() set itemsPerPage(val: number) {
    this.pagination.itemsPerPage = val;
  }
  @Input() set totalItems(val: number) {
    this.pagination.totalItems = val;
  }

  @Input() pagination: PaginationConfig = {
    currentPage: 1,
    totalPages: 1,
    itemsPerPage: 10,
    totalItems: 0,
  };

  // ─── UI Feature Flags ──────────────────────────────────────────────────────

  @Input() showToolbar: boolean = true;
  @Input() showSearch: boolean = true;
  @Input() showDateRange: boolean = false;
  @Input() showCheckboxes: boolean = false;
  @Input() showStatusToggle: boolean = false;
  @Input() statusKey: string = 'active';
  @Input() searchPlaceholder: string = 'Search';
  @Input() loading: boolean = false;
  @Input() stickyActions: boolean = true;
  @Input() tableMaxHeight: string = '800px';
  @Input() tableMinHeight: string = 'auto';

  /** If false, shows "Please search..." instead of the table or empty state. Useful for large datasets. */
  @Input() isSearchPerformed: boolean = true;
  /** Custom text for the initial (pre-search) state */
  @Input() initialTitle: string = 'No Search Results Yet';
  @Input() initialDesc: string = 'Select filters and click search to view results.';
  /** Custom text for the empty (post-search) state */
  @Input() emptyTitle: string = 'No results found';
  @Input() emptyDesc: string = 'Try adjusting your search to find what you are looking for';

  // ─── Outputs ──────────────────────────────────────────────────────────────

  @Output() onView = new EventEmitter<any>();
  @Output() onEdit = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();
  @Output() onRowClick = new EventEmitter<any>();
  @Output() onPrimaryAction = new EventEmitter<{ actionKey: string; row: any }>();
  @Output() onBulkAction = new EventEmitter<{ actionKey: string; rows: any[] }>();
  @Output() onSecondaryAction = new EventEmitter<SecondaryActionEvent>();
  @Output() onExport = new EventEmitter<string>();
  @Output() onPageChange = new EventEmitter<number>();
  @Output() onItemsPerPageChange = new EventEmitter<number>();
  @Output() onFilterApply = new EventEmitter<Record<string, any>>();
  @Output() onFilterClear = new EventEmitter<void>();
  @Output() onStatusToggle = new EventEmitter<StatusToggleEvent>();
  @Output() onSearch = new EventEmitter<string>();
  @Output() onSort = new EventEmitter<{ key: string; direction: 'asc' | 'desc' }>();
  @Output() onDateRangeSelect = new EventEmitter<{ start: Date; end: Date; range?: string }>();

  // ─── Internal State ────────────────────────────────────────────────────────

  filterPanelOpen: boolean = false;
  exportMenuOpen: boolean = false;
  datePickerOpen: boolean = false;
  openMultiDropdownKey: string | null = null;
  searchQuery: string = '';
  selectedRows: any[] = [];
  allSelected: boolean = false;

  customStartDate: string = '';
  customEndDate: string = '';

  // --- Calendar State ---
  viewDate: Date = new Date();
  startDateSelection: Date | null = null;
  endDateSelection: Date | null = null;
  calendarDays: any[] = [];

  /** Currently open kebab menu row index (-1 = none) */
  openKebabIndex: number = -1;

  /** Active sort state */
  sortKey: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  /** Active date-range filter */
  activeDateRange: string = '';

  /** Internal filter values bound to the filter panel controls */
  filterValues: Record<string, any> = {};

  /** Rows-per-page options */
  itemsPerPageOptions: number[] = [5, 10, 25, 50, 100];

  // ─── Derived getters ───────────────────────────────────────────────────────

  get hasPrimaryActions(): boolean {
    return this.primaryActions.length > 0;
  }

  get hasSecondaryActions(): boolean {
    return this.secondaryActions.length > 0;
  }

  get hasActions(): boolean {
    return this.hasPrimaryActions || this.hasSecondaryActions;
  }

  get isSingleExport(): boolean {
    return this.exportOptions.length === 1;
  }

  get isMultiExport(): boolean {
    return this.exportOptions.length > 1;
  }

  get hasExport(): boolean {
    return this.exportOptions.length > 0;
  }

  /** Build simplified visible page numbers */
  get pageNumbers(): (number | '...')[] {
    const total = this.pagination.totalPages;
    const current = this.pagination.currentPage;
    
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    if (current <= 2) return [1, 2, 3, '...', total];
    if (current >= total - 1) return [1, '...', total - 2, total - 1, total];
    return [1, '...', current, '...', total];
  }

  get rangeStart(): number {
    return (this.pagination.currentPage - 1) * this.pagination.itemsPerPage + 1;
  }

  get rangeEnd(): number {
    return Math.min(
      this.pagination.currentPage * this.pagination.itemsPerPage,
      this.pagination.totalItems
    );
  }

  get isAllSelected(): boolean {
    const source = this.clientPagination ? (this.data || []) : this.displayedData;
    return source.length > 0 && this.selectedRows.length === source.length;
  }

  get isAnythingSelected(): boolean {
    return this.selectedRows.length > 0;
  }

  get isDateRangeActive(): boolean {
    return !!this.activeDateRange || (!!this.startDateSelection && !!this.endDateSelection);
  }

  /** Which primary action types are enabled */
  hasAction(type: 'view' | 'edit' | 'delete'): boolean {
    return this.primaryActions.some(a => a.type === type);
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.initFilterValues();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.allSelected = false;
    }
    if (changes['filters']) {
      this.initFilterValues();
    }
    this.generateCalendar();
    if (this.clientPagination && (changes['data'] || changes['pagination'] || changes['clientPagination'])) {
      if (this.data) {
        this.pagination.totalItems = this.data.length;
        this.pagination.totalPages = Math.ceil(this.data.length / this.pagination.itemsPerPage) || 1;
        if (this.pagination.currentPage > this.pagination.totalPages) {
          this.pagination.currentPage = 1;
        }
      }
    }
  }

  // ─── Filter Panel ──────────────────────────────────────────────────────────

  initFilterValues(): void {
    this.filterValues = {};
    this.filters.forEach(f => {
      if (f.type === 'multiselect' || f.type === 'checkbox' || f.type === 'multidropdown') {
        this.filterValues[f.key] = this.filterValues[f.key] || [];
      } else {
        this.filterValues[f.key] = '';
      }
    });
  }

  openFilterPanel(event?: Event): void {
    if (event) event.stopPropagation();
    this.filterPanelOpen = true;
  }

  closeFilterPanel(event?: Event): void {
    if (event) event.stopPropagation();
    this.filterPanelOpen = false;
  }

  applyFilters(): void {
    this.onFilterApply.emit(this.filterValues);
    this.openMultiDropdownKey = null;
    this.closeFilterPanel();
  }

  clearFilters(): void {
    this.initFilterValues();
    this.openMultiDropdownKey = null;
    this.onFilterClear.emit();
  }

  /** Checkbox/multiselect toggle */
  toggleCheckboxOption(key: string, value: any): void {
    const current = this.filterValues[key] || [];
    const idx = current.indexOf(value);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(value);
    }
    this.filterValues[key] = [...current];
  }

  // ─── Multi-Dropdown ────────────────────────────────────────────────────────

  toggleMultiDropdown(key: string, event: Event): void {
    event.stopPropagation();
    this.openMultiDropdownKey = this.openMultiDropdownKey === key ? null : key;
  }

  selectSingleOption(key: string, value: any): void {
    this.filterValues[key] = value;
    this.openMultiDropdownKey = null; // Close after selection
  }

  getMultiDropdownLabel(filter: FilterConfig): string {
    const selected = this.filterValues[filter.key] || [];
    if (selected.length === 0) return filter.placeholder || 'Select...';
    if (selected.length === 1) {
      const opt = filter.options?.find(o => o.value === selected[0]);
      return opt ? opt.label : '1 selection';
    }
    return `${selected.length} items selected`;
  }

  getSingleSelectLabel(filter: FilterConfig): string {
    const value = this.filterValues[filter.key];
    if (value === undefined || value === null || value === '') return filter.placeholder || 'Select...';
    const opt = filter.options?.find(o => o.value === value);
    return opt ? opt.label : filter.placeholder || 'Select...';
  }

  isCheckboxSelected(filterKey: string, value: any): boolean {
    return (this.filterValues[filterKey] || []).includes(value);
  }

  // ─── Export ────────────────────────────────────────────────────────────────

  handleExportClick(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.isSingleExport) {
      this.onExport.emit(this.exportOptions[0].key);
    } else {
      this.exportMenuOpen = !this.exportMenuOpen;
    }
  }

  selectExport(key: string): void {
    this.onExport.emit(key);
    this.exportMenuOpen = false;
  }

  // ─── Pagination ────────────────────────────────────────────────────────────

  goToPage(page: number | '...'): void {
    if (page === '...' || page === this.pagination.currentPage) return;
    if (this.clientPagination) this.pagination.currentPage = page as number;
    this.onPageChange.emit(page as number);
  }

  prevPage(): void {
    if (this.pagination.currentPage > 1) {
      this.goToPage(this.pagination.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.pagination.currentPage < this.pagination.totalPages) {
      this.goToPage(this.pagination.currentPage + 1);
    }
  }

  changeItemsPerPage(event: Event): void {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    this.pagination.itemsPerPage = val;
    this.pagination.currentPage = 1; // Always reset to first page on size change

    if (this.clientPagination) {
      if (this.data) {
        this.pagination.totalPages = Math.ceil(this.data.length / val) || 1;
      }
    }
    this.onItemsPerPageChange.emit(val);
  }

  // ─── Sorting ───────────────────────────────────────────────────────────────

  sortBy(key: string): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }

    if (this.clientPagination) {
      this.pagination.currentPage = 1; // Reset to first page when sorting locally
    }

    this.onSort.emit({ key: this.sortKey, direction: this.sortDirection });
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  viewRow(row: any): void {
    this.onPrimaryAction.emit({ actionKey: 'view', row });
    this.onView.emit(row);
  }

  editRow(row: any): void {
    this.onPrimaryAction.emit({ actionKey: 'edit', row });
    this.onEdit.emit(row);
  }

  deleteRow(row: any): void {
    this.onPrimaryAction.emit({ actionKey: 'delete', row });
    this.onDelete.emit(row);
  }

  triggerPrimaryAction(action: any, row: any, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    switch (action.type) {
      case 'view': this.viewRow(row); break;
      case 'edit': this.editRow(row); break;
      case 'delete': this.deleteRow(row); break;
      default: 
        this.onPrimaryAction.emit({ actionKey: action.actionKey || action.type || 'custom', row });
        break;
    }
  }

  triggerSecondary(key: string, row: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.onSecondaryAction.emit({ key, row });
    this.openKebabIndex = -1;
  }

  toggleKebab(index: number, event: Event): void {
    event.stopPropagation();
    this.openKebabIndex = this.openKebabIndex === index ? -1 : index;
  }

  // ─── Status Toggle ─────────────────────────────────────────────────────────
  /** Toggles a status boolean for a row */
  handleStatusToggle(row: any, event: Event): void {
    event.stopPropagation();
    const input = event.target as HTMLInputElement;
    const newVal = input.checked;
    this.onStatusToggle.emit({ row, value: newVal });
  }

  triggerRowClick(row: any): void {
    this.onRowClick.emit(row);
  }

  // ─── Selection ─────────────────────────────────────────────────────────────


  toggleAll(): void {
    if (this.isAllSelected) {
      this.selectedRows = [];
    } else {
      if (this.clientPagination && this.data) {
        this.selectedRows = [...this.data];
      } else {
        this.selectedRows = [...this.displayedData];
      }
    }
  }

  isRowSelected(row: any): boolean {
    return this.selectedRows.some(r => r.id === row.id);
  }

  toggleRow(row: any, event?: Event): void {
    if (event) event.stopPropagation();
    const index = this.selectedRows.findIndex(r => r.id === row.id);
    if (index > -1) {
      this.selectedRows.splice(index, 1);
    } else {
      this.selectedRows.push(row);
    }
  }

  triggerBulkAction(action: PrimaryAction): void {
    this.onBulkAction.emit({
      actionKey: action.actionKey || action.type,
      rows: this.selectedRows
    });
  }

  // ─── Search ────────────────────────────────────────────────────────────────

  handleSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery = query;
    if (this.clientPagination) {
      this.pagination.currentPage = 1;
    }
  }

  triggerSearchEmit(): void {
    this.pagination.currentPage = 1;
    if (!this.clientPagination) {
      this.onSearch.emit(this.searchQuery);
    }
  }

  handleSearch(event: Event): void {
    this.handleSearchInput(event);
  }

  // ─── Date Range ────────────────────────────────────────────────────────────

  setDateRange(range: string): void {
    this.activeDateRange = range;
    const end = new Date();
    const start = new Date();
    
    switch (range) {
      case '1D': start.setDate(end.getDate() - 1); break;
      case '1W': start.setDate(end.getDate() - 7); break;
      case '1M': start.setMonth(end.getMonth() - 1); break;
      case '3M': start.setMonth(end.getMonth() - 3); break;
      case '6M': start.setMonth(end.getMonth() - 6); break;
      case '1Y': start.setFullYear(end.getFullYear() - 1); break;
      case 'ALL': 
        this.onDateRangeSelect.emit({ start: null as any, end: null as any, range });
        return;
    }
    
    this.onDateRangeSelect.emit({ start, end, range: range });
  }

  toggleDatePicker(event?: Event): void {
    if (event) event.stopPropagation();
    this.datePickerOpen = !this.datePickerOpen;
    if (this.datePickerOpen) {
      this.generateCalendar();
    }
    if (this.exportMenuOpen) this.exportMenuOpen = false;
  }

  // --- Calendar Logic ---
  generateCalendar(): void {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Days from prev month to fill the first row
    const days: any[] = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const startOffset = firstDay.getDay(); // 0 = Sunday
    
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }
    
    // Days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        day: i,
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Days from next month to fill the last row (up to 42 total days for 6 rows)
    const endOffset = 42 - days.length;
    for (let i = 1; i <= endOffset; i++) {
      days.push({
        day: i,
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    this.calendarDays = days;
  }

  changeMonth(dir: number, event: Event): void {
    event.stopPropagation();
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + dir, 1);
    this.generateCalendar();
  }

  selectDate(date: Date, event: Event): void {
    event.stopPropagation();
    if (!this.startDateSelection || (this.startDateSelection && this.endDateSelection)) {
      this.startDateSelection = date;
      this.endDateSelection = null;
    } else if (date < this.startDateSelection) {
      this.startDateSelection = date;
    } else {
      this.endDateSelection = date;
    }
  }

  isInRange(date: Date): boolean {
    if (!this.startDateSelection || !this.endDateSelection) return false;
    return date > this.startDateSelection && date < this.endDateSelection;
  }

  isSelectionStart(date: Date): boolean {
    return !!this.startDateSelection && date.getTime() === this.startDateSelection.getTime();
  }

  isSelectionEnd(date: Date): boolean {
    return !!this.endDateSelection && date.getTime() === this.endDateSelection.getTime();
  }

  formatDate(date: Date | null): string {
    if (!date) return '';
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  applyCustomDateRange(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.startDateSelection && this.endDateSelection) {
      this.activeDateRange = '';
      this.onDateRangeSelect.emit({
        start: this.formatDate(this.startDateSelection) as any,
        end: this.formatDate(this.endDateSelection) as any,
        range: 'custom'
      });
      this.datePickerOpen = false;
    }
  }

  clearCalendar(event: Event): void {
    event.stopPropagation();
    this.startDateSelection = null;
    this.endDateSelection = null;
    this.activeDateRange = '';
  }

  // ─── Click Outside ────────────────────────────────────────────────────────

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    // Filter panel - close if clicking outside the panel
    if (this.filterPanelOpen && !target.closest('.kjt-filter-panel')) {
      this.filterPanelOpen = false;
    }

    // Export menu - close if clicking outside the wrap
    if (this.exportMenuOpen && !target.closest('.kjt-export-wrap')) {
      this.exportMenuOpen = false;
    }

    // Kebab menu - close if clicking outside the wrap
    if (this.openKebabIndex !== -1 && !target.closest('.kjt-kebab-wrap')) {
      this.openKebabIndex = -1;
    }

    // Date picker - close if clicking outside the wrap
    if (this.datePickerOpen && !target.closest('.kjt-export-wrap')) {
      this.datePickerOpen = false;
    }

    // Multi-dropdown (inside filter panel)
    if (this.openMultiDropdownKey && !target.closest('.kjt-fp-mselect-wrap')) {
      this.openMultiDropdownKey = null;
    }
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  trackByIndex(index: number): number {
    return index;
  }

  trackByKey(index: number, col: TableColumn): string {
    return col.key;
  }
}
