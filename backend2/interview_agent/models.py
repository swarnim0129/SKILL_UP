from typing import List, Optional

from pydantic import BaseModel, Field


class StartInterviewRequest(BaseModel):
  """
  Internal representation of the start-interview payload.
  The public endpoint uses multipart/form-data for the PDF.
  """

  job_description: str = Field(
      ..., description="The textual job description for the role."
  )
  candidate_name: str = Field(..., description="Name of the candidate.")
  candidate_email: str = Field(..., description="Email address of the candidate.")


class QuestionItem(BaseModel):
  id: int
  difficulty: str = Field(description="easy, medium, or hard")
  category: str = Field(description="technical, behavioral, or system design")
  question: str


class QuestionsOutput(BaseModel):
  questions: List[QuestionItem]


class InterviewMetadata(BaseModel):
  totalQuestions: int
  easyCount: int
  mediumCount: int
  hardCount: int


class FormattedVapiData(BaseModel):
  questions: List[dict]
  systemPrompt: str
  firstMessage: str
  candidateName: str
  candidateEmail: str
  interviewMetadata: InterviewMetadata


class ArtifactMessage(BaseModel):
  transcript: str


class VapiCallInfo(BaseModel):
  assistantId: Optional[str] = None


class VapiMessageContent(BaseModel):
  type: str  # looking for "end-of-call-report"
  artifact: Optional[ArtifactMessage] = None
  call: Optional[VapiCallInfo] = None


class VapiCallbackPayload(BaseModel):
  message: VapiMessageContent


class CandidateInfo(BaseModel):
  name: str = "Candidate"
  email: str = ""


class EvaluationItem(BaseModel):
  questionNumber: int
  question: str
  answer: str
  difficulty: str
  category: str
  score: int
  maxScore: int
  feedback: str


class ReportSummary(BaseModel):
  strengths: List[str]
  painPoints: List[str]
  areasToImprove: List[str]


class FinalReportOutput(BaseModel):
  candidateInfo: CandidateInfo
  interviewStatus: str = Field(description="complete | partial | incomplete")
  questionsAnswered: int
  totalQuestions: int
  overallScore: int
  evaluations: List[EvaluationItem]
  summary: ReportSummary
  recommendation: str = Field(
      description="Strong Hire | Hire | Maybe | No Hire"
  )
  detailedReport: str

