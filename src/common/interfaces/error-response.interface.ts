export interface ErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  errors?: ValidationError[];
  timestamp: string;
  path: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface SuccessResponse<T = any> {
  success: true;
  statusCode: number;
  message?: string;
  data?: T;
  timestamp: string;
}
