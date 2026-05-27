/**
 * 9M Schedule PWA — Reports Page Controller
 */
const ReportsPage = {
  _selectedType: 'electrical', // electrical | mechanical

  render() {
    const page = document.getElementById('page-reports');
    const completions = Store.get('completions') || {};
    const staff = Store.get('staffData') || [];
    const sses = staff.filter(s => s.is_sse);
    const techs = staff.filter(s => !s.is_sse);

    // Calculate active completions for selected schedule type
    const completionsCount = Object.keys(completions).length;

    page.innerHTML = `
      <div class="reports-header no-print anim-fade-in-up" style="margin-bottom: var(--space-4);">
        <h2 class="schedule-title">📊 Reports & Export</h2>
        <p class="schedule-count">Compile maintenance schedules, print, or export as PDF.</p>
      </div>

      <!-- Report Config Card -->
      <div class="card no-print anim-fade-in-up" style="margin-bottom: var(--space-4);">
        <h3 style="font-size: var(--text-sm); font-weight: 700; text-transform: uppercase; margin-bottom: var(--space-3); color: var(--primary-400);">Report Configuration</h3>
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3);">
            <div class="form-group">
              <label class="form-label">Schedule Type</label>
              <select id="report-type" class="form-select" onchange="ReportsPage._setType(this.value)">
                <option value="electrical" ${this._selectedType === 'electrical' ? 'selected' : ''}>⚡ Electrical</option>
                <option value="mechanical" ${this._selectedType === 'mechanical' ? 'selected' : ''}>🔧 Mechanical</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Report Date</label>
              <input type="date" id="report-date" class="form-input" value="${Utils.formatDate(new Date(), 'YYYY-MM-DD')}">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Remarks / Additional Notes</label>
            <input type="text" id="report-notes" class="form-input" placeholder="e.g. 9M Schedule completed with no major issues.">
          </div>

          <div style="display: flex; gap: var(--space-2); margin-top: var(--space-2);">
            <button class="btn btn-outline btn-sm" style="flex:1;" onclick="ReportsPage.render()">🔄 Refresh Preview</button>
            <button class="btn btn-primary btn-sm" style="flex:1;" onclick="ReportsPage._printReport()">🖨️ Print / Save PDF</button>
          </div>
        </div>
      </div>

      <!-- Report Container (Visually premium report layout) -->
      <div id="printable-report" class="card report-print-container anim-fade-in-up" style="padding: var(--space-6); background: white; color: #1e293b; border-color: #cbd5e1; border-radius: var(--radius-md);">
        ${this._buildReportHTML()}
      </div>
    `;
  },

  _setType(type) {
    this._selectedType = type;
    this.render();
  },

  _buildReportHTML() {
    const type = this._selectedType;
    const date = document.getElementById('report-date')?.value || Utils.formatDate(new Date(), 'YYYY-MM-DD');
    const notes = document.getElementById('report-notes')?.value || 'N/A';
    
    const staff = Store.get('staffData') || [];
    const sses = staff.filter(s => s.is_sse);
    const techs = staff.filter(s => !s.is_sse);
    const coaches = Store.get('coachData') || [];
    const completions = Store.get('completions') || {};
    const scheduleData = Store.get(`scheduleData.${type}`);

    if (!scheduleData || !scheduleData.equipment) {
      return '<p style="text-align: center; color: var(--text-tertiary); padding: var(--space-8);">No data available to preview.</p>';
    }

    // Compile completed list of rows
    const reportRows = [];
    let completedCount = 0;
    let totalCount = 0;

    scheduleData.equipment.forEach(equip => {
      equip.sub_sections.forEach(sec => {
        (sec.activities || []).forEach(act => {
          totalCount++;
          // Get completions across all applicable coaches
          const appCoaches = equip.applicable_coaches || [];
          let completedCoachesList = [];
          let hasAbnormal = false;
          let abnormalDetailsList = [];
          const sseNames = new Set();
          const staffNames = new Set();
          const dateToSse = {};
          const dateToStaff = {};

          appCoaches.forEach(coach => {
            const compKey = `${act.id}_${coach}`;
            const comp = completions[compKey];
            if (comp && comp.completed) {
              const dateStr = comp.completion_date || '';
              let dateBadge = '';
              let formattedDate = '';
              if (dateStr) {
                try {
                  const [yyyy, mm, dd] = dateStr.split('-');
                  formattedDate = `${dd}/${mm}`;
                  dateBadge = ` (${formattedDate})`;
                } catch (e) {}
              }

              // Format measured value or pass/fail
              let formattedVal = '';
              if (comp.measured_value) {
                try {
                  const parsed = JSON.parse(comp.measured_value);
                  if (typeof parsed === 'object' && parsed !== null) {
                    const parts = Object.entries(parsed).map(([k, v]) => {
                      let isOut = false;
                      if (typeof App !== 'undefined' && App.isSingleValueOutOfRange) {
                        isOut = App.isSingleValueOutOfRange(act.id, k, v);
                      }
                      if (isOut) {
                        return `<span style="color: #ef4444; font-weight: bold; background: #fee2e2; padding: 1px 4px; border-radius: 2px;">${k}:${v} ⚠️</span>`;
                      }
                      return `${k}:${v}`;
                    });
                    formattedVal = ` [${parts.join(', ')}]`;
                  } else {
                    let isOut = false;
                    if (typeof App !== 'undefined' && App.isSingleValueOutOfRange) {
                      isOut = App.isSingleValueOutOfRange(act.id, 'Value', comp.measured_value);
                    }
                    if (isOut) {
                      formattedVal = ` <span style="color: #ef4444; font-weight: bold; background: #fee2e2; padding: 1px 4px; border-radius: 2px;" title="Out of Range">[${comp.measured_value}] ⚠️</span>`;
                    } else {
                      formattedVal = ` [${comp.measured_value}]`;
                    }
                  }
                } catch (e) {
                  formattedVal = ` [${comp.measured_value}]`;
                }
              } else if (comp.pass_fail_result) {
                formattedVal = ` [${comp.pass_fail_result}]`;
              }

              completedCoachesList.push(`${coach}${dateBadge}${formattedVal}`);

              // Get SSE
              if (comp.sse_id) {
                const sse = staff.find(s => s.id === comp.sse_id);
                if (sse) {
                  sseNames.add(sse.name);
                  if (formattedDate) {
                    if (!dateToSse[formattedDate]) dateToSse[formattedDate] = new Set();
                    dateToSse[formattedDate].add(sse.name);
                  }
                }
              }

              // Get Staff
              if (comp.done_by_staff && Array.isArray(comp.done_by_staff)) {
                comp.done_by_staff.forEach(staffId => {
                  const member = staff.find(s => s.id === staffId);
                  if (member) {
                    staffNames.add(member.name);
                    if (formattedDate) {
                      if (!dateToStaff[formattedDate]) dateToStaff[formattedDate] = new Set();
                      dateToStaff[formattedDate].add(member.name);
                    }
                  }
                });
              }

              // Check abnormalities
              if (comp.abnormality && comp.abnormality.has_issue) {
                hasAbnormal = true;
                const issueEsc = Utils.escapeHtml(comp.abnormality.issue_description);
                let photoImg = '';
                if (comp.abnormality.photo) {
                  photoImg = `<br><img src="${comp.abnormality.photo}" style="max-height: 45px; max-width: 90px; border-radius: var(--radius-sm); border: 1px solid #cbd5e1; margin-top: 4px; display: inline-block;">`;
                }
                abnormalDetailsList.push(`<strong>${coach}</strong>: ${issueEsc}${photoImg}`);
              }
            }
          });

          if (completedCoachesList.length > 0) {
            completedCount++;

            // Compile SSE Text
            let sseText = 'Pending';
            if (sseNames.size === 1) {
              sseText = Array.from(sseNames)[0];
            } else if (sseNames.size > 1) {
              const dates = Object.keys(dateToSse);
              if (dates.length > 0) {
                sseText = Object.entries(dateToSse)
                  .map(([d, sses]) => `${Array.from(sses).join('/')} (${d})`)
                  .join(', ');
              } else {
                sseText = Array.from(sseNames).join(', ');
              }
            }

            // Compile Done By Staff Text
            let staffText = 'Pending';
            if (staffNames.size > 0) {
              const dates = Object.keys(dateToStaff);
              if (dates.length <= 1) {
                staffText = Array.from(staffNames).join(', ');
              } else {
                let allSame = true;
                const firstSet = dateToStaff[dates[0]];
                for (let i = 1; i < dates.length; i++) {
                  const currentSet = dateToStaff[dates[i]];
                  if (currentSet.size !== firstSet.size || !Array.from(currentSet).every(val => firstSet.has(val))) {
                    allSame = false;
                    break;
                  }
                }

                if (allSame) {
                  staffText = Array.from(firstSet).join(', ');
                } else {
                  staffText = Object.entries(dateToStaff)
                    .map(([d, set]) => `<strong>${d}</strong>: ${Array.from(set).join(', ')}`)
                    .join('<br>');
                }
              }
            }

            reportRows.push({
              equipNo: equip.item_no,
              equipName: equip.short_name || equip.name,
              seqNo: act.seq_no || '·',
              description: act.description,
              completedCoaches: completedCoachesList,
              sse: sseText,
              staff: staffText,
              abnormal: hasAbnormal ? abnormalDetailsList.join('<br>') : 'None'
            });
          }
        });
      });
    });

    const completionPercent = totalCount > 0 ? Utils.percentage(completedCount, totalCount) : 0;

    return `
      <!-- Print Style Header (hidden on screen, visible on print) -->
      <div class="print-header" style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: var(--space-4); margin-bottom: var(--space-4);">
        <h1 style="font-size: 1.5rem; font-weight: 800; color: #0f172a; margin: 0;">INDIAN RAILWAYS</h1>
        <h2 style="font-size: 1.15rem; font-weight: 700; color: #1e293b; margin: 2px 0 0 0;">COACHING DEPOT — AGRA (AGC) • NORTH CENTRAL RAILWAY</h2>
        <h3 style="font-size: 0.95rem; font-weight: 600; color: #475569; margin: 2px 0 0 0; text-transform: uppercase;">
          9-Monthly (9M) Maintenance Schedule Completion Report — ${type === 'electrical' ? 'Electrical' : 'Mechanical'}
        </h3>
      </div>

      <!-- Metadata info block -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-6); font-size: 0.75rem; border-bottom: 1px solid #e2e8f0; padding-bottom: var(--space-3); margin-bottom: var(--space-4);">
        <div>
          <p style="margin: 3px 0;"><strong>Trainset No:</strong> Vande Bharat Express (VB 20176)</p>
          <p style="margin: 3px 0;"><strong>Rake ID:</strong> Rake 42</p>
          <p style="margin: 3px 0;"><strong>Maintenance Depot:</strong> Agra Cantonment (AGC)</p>
          <p style="margin: 3px 0;"><strong>Completion Date:</strong> ${date}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 3px 0;"><strong>Total Activities:</strong> ${totalCount}</p>
          <p style="margin: 3px 0;"><strong>Completed Tasks:</strong> ${completedCount} (${completionPercent}%)</p>
          <p style="margin: 3px 0;"><strong>Pending Tasks:</strong> ${totalCount - completedCount}</p>
          <p style="margin: 3px 0;"><strong>Report Generated:</strong> ${Utils.formatDate(new Date(), 'YYYY-MM-DD HH:mm')}</p>
        </div>
      </div>

      <!-- Additional Notes -->
      <div style="font-size: 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); margin-bottom: var(--space-4);">
        <strong>Report Remarks:</strong> ${Utils.escapeHtml(notes)}
      </div>

      <!-- Completed Items Table -->
      <div style="margin-bottom: var(--space-6); overflow-x: auto;">
        <table class="report-table" style="width: 100%; border-collapse: collapse; font-size: 0.65rem;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
              <th style="padding: var(--space-2); border: 1px solid #cbd5e1; width: 40px;">Item</th>
              <th style="padding: var(--space-2); border: 1px solid #cbd5e1; width: 120px;">Equipment</th>
              <th style="padding: var(--space-2); border: 1px solid #cbd5e1;">Activity Details</th>
              <th style="padding: var(--space-2); border: 1px solid #cbd5e1; width: 100px;">Completed Coaches</th>
              <th style="padding: var(--space-2); border: 1px solid #cbd5e1; width: 80px;">SSE</th>
              <th style="padding: var(--space-2); border: 1px solid #cbd5e1; width: 80px;">Done By Staff</th>
              <th style="padding: var(--space-2); border: 1px solid #cbd5e1; width: 100px;">Abnormalities</th>
            </tr>
          </thead>
          <tbody>
            ${reportRows.length === 0 ? `
              <tr>
                <td colspan="7" style="padding: var(--space-4); text-align: center; color: #64748b;">No activities completed yet for this schedule.</td>
              </tr>
            ` : reportRows.map(row => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: var(--space-2); border: 1px solid #cbd5e1; font-weight: 700; text-align: center;">${row.equipNo}.${row.seqNo}</td>
                <td style="padding: var(--space-2); border: 1px solid #cbd5e1; font-weight: 600;">${Utils.escapeHtml(row.equipName)}</td>
                <td style="padding: var(--space-2); border: 1px solid #cbd5e1;">${Utils.escapeHtml(row.description)}</td>
                <td style="padding: var(--space-2); border: 1px solid #cbd5e1; font-weight: 700; color: #047857;">${row.completedCoaches.join(', ')}</td>
                <td style="padding: var(--space-2); border: 1px solid #cbd5e1;">${Utils.escapeHtml(row.sse)}</td>
                <td style="padding: var(--space-2); border: 1px solid #cbd5e1;">${Utils.escapeHtml(row.staff)}</td>
                <td style="padding: var(--space-2); border: 1px solid #cbd5e1; color: ${row.abnormal !== 'None' ? '#b91c1c' : 'inherit'}">${row.abnormal}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Signature Blocks -->
      <div style="margin-top: var(--space-10); font-size: 0.75rem;">
        <!-- Technicians side-by-side signature blocks -->
        <div style="page-break-inside: avoid; margin-bottom: var(--space-8);">
          <p style="font-weight: 800; border-bottom: 2px solid #1e293b; padding-bottom: 4px; margin-bottom: var(--space-6); color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; page-break-after: avoid;">
            ✒️ TECHNICIAN SIGN-OFFS (SR.TECH / TECH-I / TECH-II / ASST.)
          </p>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px 16px;">
            ${techs.map(t => `
              <div style="text-align: center; page-break-inside: avoid;">
                <div style="border-bottom: 1.5px dashed #94a3b8; height: 50px; margin-bottom: 6px; background: rgba(248, 250, 252, 0.5);"></div>
                <p style="margin: 0; font-weight: 700; font-size: 0.68rem; color: #0f172a;">${Utils.escapeHtml(t.name)}</p>
                <p style="margin: 0; color: #64748b; font-size: 0.58rem; font-weight: 600;">${Utils.escapeHtml(t.designation)}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- SSE Blocks (Placed at the very bottom) -->
        <div style="page-break-inside: avoid; margin-top: var(--space-8);">
          <p style="font-weight: 800; border-bottom: 2px solid #1e293b; padding-bottom: 4px; margin-bottom: var(--space-6); color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; page-break-after: avoid;">
            📋 SUPERVISORY APPROVAL & SIGN-OFF (SSE/C&W)
          </p>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-8); text-align: center; margin-top: var(--space-4); margin-bottom: var(--space-6);">
            ${sses.map(s => `
              <div>
                <div style="border-bottom: 1.5px solid #0f172a; height: 60px; margin-bottom: 6px; background: rgba(248, 250, 252, 0.5);"></div>
                <p style="margin: 0; font-weight: 800; font-size: 0.75rem; color: #0f172a;">${Utils.escapeHtml(s.name)}</p>
                <p style="margin: 0; color: #475569; font-size: 0.6rem; font-weight: 600;">${Utils.escapeHtml(s.designation)}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  _printReport() {
    window.print();
  }
};
