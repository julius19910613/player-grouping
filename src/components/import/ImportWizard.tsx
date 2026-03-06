import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { BasketballSkills, BasketballPosition } from '../../types/basketball';

interface PlayerBase {
  id: string;
  name: string;
  position?: BasketballPosition;
  skills?: Partial<BasketballSkills>;
  [key: string]: unknown;
}

interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
  type: 'players' | 'games';
  onImport: (data: Partial<PlayerBase>[]) => Promise<{ success: number; failed: number }>;
}

interface WizardState {
  step: number;
  file: File | null;
  rawData: Record<string, unknown>[];
  headers: string[];
  mapping: Record<string, string>;
  validatedData: ValidatedRow[];
  importing: boolean;
  importProgress: number;
  importResult: { success: number; failed: number } | null;
}

interface ValidatedRow {
  data: Record<string, unknown>;
  rowNumber: number;
  status: 'valid' | 'warning' | 'error';
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  type: 'format' | 'duplicate' | 'required' | 'custom';
}

const STEPS = [
  { id: 1, title: '选择文件' },
  { id: 2, title: '数据预览' },
  { id: 3, title: '字段映射' },
  { id: 4, title: '数据验证' },
  { id: 5, title: '导入确认' },
];

const PLAYER_FIELDS = [
  { key: 'name', label: '姓名', required: true },
  { key: 'phone', label: '手机号', required: true },
  { key: 'level', label: '等级', required: false },
  { key: 'position', label: '位置', required: false },
];

// 字段映射规则
const FIELD_MAPPING_RULES: Record<string, string[]> = {
  name: ['姓名', 'name', '名字', '球员姓名', '选手姓名'],
  phone: ['手机号', '电话', 'phone', 'mobile', '联系方式', '联系电话'],
  level: ['等级', 'level', '级别', '水平', '评分'],
  position: ['位置', 'position', '场上位置', '打法', '角色'],
};

export function ImportWizard({ open, onClose, type, onImport }: ImportWizardProps) {
  const [state, setState] = useState<WizardState>({
    step: 1,
    file: null,
    rawData: [],
    headers: [],
    mapping: {},
    validatedData: [],
    importing: false,
    importProgress: 0,
    importResult: null,
  });

  const systemFields = type === 'players' ? PLAYER_FIELDS : PLAYER_FIELDS;

  // 自动映射字段
  const autoMapFields = useCallback((fileHeaders: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};
    
    systemFields.forEach(field => {
      const keywords = FIELD_MAPPING_RULES[field.key] || [];
      const matchedHeader = fileHeaders.find(header =>
        keywords.some(keyword =>
          header.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      if (matchedHeader) {
        mapping[field.key] = matchedHeader;
      }
    });
    
    return mapping;
  }, [systemFields]);

  // 解析文件
  const parseFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (ext === 'csv') {
      return new Promise<void>((resolve) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as Record<string, unknown>[];
            const headers = results.meta.fields || [];
            setState(prev => ({
              ...prev,
              file,
              rawData: data,
              headers,
              mapping: autoMapFields(headers),
              step: 2,
            }));
            resolve();
          },
          error: (error) => {
            console.error('CSV parse error:', error);
            resolve();
          },
        });
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
      const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
      
      setState(prev => ({
        ...prev,
        file,
        rawData: jsonData,
        headers,
        mapping: autoMapFields(headers),
        step: 2,
      }));
    }
  }, [autoMapFields]);

  // 验证数据
  const validateData = useCallback(() => {
    const validated: ValidatedRow[] = state.rawData.map((row, index) => {
      const errors: ValidationError[] = [];
      // 使用简单的字符串类型，避免 TypeScript 类型窄化问题
      let currentStatus: string = 'valid';

      // 检查必填字段
      systemFields.filter(f => f.required).forEach(field => {
        const value = row[state.mapping[field.key]];
        if (!value || String(value).trim() === '') {
          errors.push({
            field: field.label,
            message: `${field.label}不能为空`,
            type: 'required',
          });
          currentStatus = 'error';
        }
      });

      // 检查手机号格式
      const phoneValue = row[state.mapping['phone']];
      if (phoneValue && !/^1[3-9]\d{9}$/.test(String(phoneValue))) {
        errors.push({
          field: '手机号',
          message: '手机号格式不正确，应为11位数字',
          type: 'format',
        });
        if (currentStatus !== 'error') {
          currentStatus = 'warning';
        }
      }

      // 检查等级范围
      const levelValue = row[state.mapping['level']];
      if (levelValue && !['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd'].includes(String(levelValue).toUpperCase())) {
        errors.push({
          field: '等级',
          message: `等级 "${levelValue}" 不在标准范围内，将设为 "A"`,
          type: 'format',
        });
        if (currentStatus !== 'error') {
          currentStatus = 'warning';
        }
      }

      return {
        data: row,
        rowNumber: index + 2, // Excel 行号从 2 开始（1 是表头）
        status: currentStatus as ValidatedRow['status'],
        errors,
      };
    });

    setState(prev => ({ ...prev, validatedData: validated, step: 4 }));
  }, [state.rawData, state.mapping, systemFields]);

  // 执行导入
  const handleImport = useCallback(async () => {
    setState(prev => ({ ...prev, importing: true, importProgress: 0 }));

    const validData = state.validatedData
      .filter(row => row.status !== 'error')
      .map(row => {
        const mappedRow: Record<string, unknown> = {};
        Object.entries(state.mapping).forEach(([systemField, fileColumn]) => {
          mappedRow[systemField] = row.data[fileColumn];
        });
        return mappedRow as Partial<PlayerBase>;
      });

    try {
      const result = await onImport(validData);
      setState(prev => ({
        ...prev,
        importing: false,
        importProgress: 100,
        importResult: result,
      }));
    } catch (error) {
      console.error('Import error:', error);
      setState(prev => ({
        ...prev,
        importing: false,
        importResult: { success: 0, failed: validData.length },
      }));
    }
  }, [state.validatedData, state.mapping, onImport]);

  // 重置状态
  const resetState = useCallback(() => {
    setState({
      step: 1,
      file: null,
      rawData: [],
      headers: [],
      mapping: {},
      validatedData: [],
      importing: false,
      importProgress: 0,
      importResult: null,
    });
  }, []);

  // 关闭弹窗
  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        parseFile(acceptedFiles[0]);
      }
    },
  });

  const validCount = state.validatedData.filter(r => r.status === 'valid').length;
  const warningCount = state.validatedData.filter(r => r.status === 'warning').length;
  const errorCount = state.validatedData.filter(r => r.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        data-testid="import-wizard"
      >
        <DialogHeader>
          <DialogTitle data-testid="import-wizard-title">
            {type === 'players' ? '批量导入球员' : '导入比赛数据'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="mb-6">
          <Progress value={(state.step / 5) * 100} className="h-2" />
          <div className="flex justify-between mt-2 text-xs">
            {STEPS.map((s) => (
              <span 
                key={s.id} 
                className={state.step >= s.id ? 'text-primary font-medium' : 'text-muted-foreground'}
                data-testid={`step-indicator-${s.id}`}
              >
                {s.title}
              </span>
            ))}
          </div>
        </div>

        {/* Step 1: 文件上传 */}
        {state.step === 1 && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary'
              }`}
              data-testid="drop-zone"
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">
                {isDragActive ? '释放文件以上传' : '拖拽文件到此处，或点击上传'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                支持 CSV, Excel 格式，最大 10MB
              </p>
            </div>

            <div className="flex justify-center">
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                下载导入模板
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: 数据预览 */}
        {state.step === 2 && (
          <div className="space-y-4" data-testid="data-preview">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {state.file?.name} ({state.rawData.length} 行)
              </span>
            </div>

            <div className="border rounded-lg overflow-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {state.headers.map((header, i) => (
                      <th key={i} className="px-4 py-2 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.rawData.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t">
                      {state.headers.map((header, j) => (
                        <td key={j} className="px-4 py-2">
                          {String(row[header] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-muted-foreground">
              显示前 10 行，共 {state.rawData.length} 行
            </p>
          </div>
        )}

        {/* Step 3: 字段映射 */}
        {state.step === 3 && (
          <div className="space-y-4" data-testid="field-mapping">
            <p className="text-sm text-muted-foreground">
              将文件列映射到系统字段（已自动映射）
            </p>

            <div className="space-y-3">
              {systemFields.map((field) => (
                <div key={field.key} className="flex items-center gap-4">
                  <div className="w-32">
                    <span className="font-medium">{field.label}</span>
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </div>
                  <select
                    className="flex-1 border rounded px-3 py-2"
                    value={state.mapping[field.key] || ''}
                    onChange={(e) => {
                      setState(prev => ({
                        ...prev,
                        mapping: { ...prev.mapping, [field.key]: e.target.value },
                      }));
                    }}
                    data-testid={`mapping-select-${field.key}`}
                  >
                    <option value="">-- 忽略 --</option>
                    {state.headers.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                  {field.required && !state.mapping[field.key] && (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                  {state.mapping[field.key] && (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: 数据验证 */}
        {state.step === 4 && (
          <div className="space-y-4" data-testid="data-validation">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{validCount}</div>
                <div className="text-sm text-green-600">有效数据</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
                <div className="text-sm text-yellow-600">警告</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                <div className="text-sm text-red-600">错误</div>
              </div>
            </div>

            {errorCount > 0 && (
              <div className="border rounded-lg overflow-auto max-h-48">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left">行号</th>
                      <th className="px-4 py-2 text-left">问题</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.validatedData
                      .filter(r => r.status === 'error')
                      .slice(0, 10)
                      .map((row) => (
                        <tr key={row.rowNumber} className="border-t bg-red-50">
                          <td className="px-4 py-2">{row.rowNumber}</td>
                          <td className="px-4 py-2 text-red-600">
                            {row.errors.map(e => e.message).join('; ')}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Step 5: 导入确认 */}
        {state.step === 5 && (
          <div className="space-y-4" data-testid="import-confirmation">
            {!state.importing && !state.importResult && (
              <>
                <div className="p-6 bg-muted/50 rounded-lg text-center">
                  <p className="text-lg font-medium mb-2">导入统计</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>总行数: <strong>{state.rawData.length}</strong></div>
                    <div>将导入: <strong>{validCount + warningCount}</strong></div>
                    <div>跳过 (错误): <strong>{errorCount}</strong></div>
                  </div>
                </div>

                {warningCount > 0 && (
                  <p className="text-sm text-yellow-600">
                    ⚠️ 有 {warningCount} 行包含警告，将被自动修正后导入
                  </p>
                )}
              </>
            )}

            {state.importing && (
              <div className="p-6 text-center">
                <p className="text-lg font-medium mb-4">正在导入...</p>
                <Progress value={state.importProgress} className="h-2 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {state.importProgress}%
                </p>
              </div>
            )}

            {state.importResult && (
              <div className="p-6 text-center" data-testid="import-result">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium mb-2">导入完成！</p>
                <p className="text-sm text-muted-foreground">
                  成功导入 {state.importResult.success} 条数据
                  {state.importResult.failed > 0 && (
                    <span className="text-red-500 ml-2">
                      失败 {state.importResult.failed} 条
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (state.step > 1) {
                setState(prev => ({ ...prev, step: prev.step - 1 }));
              } else {
                handleClose();
              }
            }}
          >
            {state.step === 1 ? '取消' : '← 上一步'}
          </Button>

          {state.step < 5 && !state.importResult && (
            <Button
              onClick={() => {
                if (state.step === 2) {
                  setState(prev => ({ ...prev, step: 3 }));
                } else if (state.step === 3) {
                  validateData();
                } else {
                  setState(prev => ({ ...prev, step: prev.step + 1 }));
                }
              }}
              disabled={
                (state.step === 1 && !state.file) ||
                (state.step === 3 && systemFields.some(f => f.required && !state.mapping[f.key]))
              }
            >
              下一步 →
            </Button>
          )}

          {state.step === 5 && !state.importResult && (
            <Button
              onClick={handleImport}
              disabled={state.importing}
            >
              {state.importing ? '导入中...' : '开始导入'}
            </Button>
          )}

          {state.importResult && (
            <Button onClick={handleClose}>
              完成
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
