// tests/index.test.js
import { handler } from "../src/index.js";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Mock environment variables
process.env.EMAIL_FROM = "no-reply@example.com";
process.env.EMAIL_TO = "support@example.com";
process.env.AWS_REGION = "us-east-1";

// Mock AWS SES
jest.mock("@aws-sdk/client-ses", () => {
  const actual = jest.requireActual("@aws-sdk/client-ses");
  return {
    ...actual,
    SESClient: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
    SendEmailCommand: actual.SendEmailCommand,
  };
});

describe("send-email-lambda", () => {
  const mockSend = jest.fn();

  beforeEach(() => {
    SESClient.mockImplementation(() => ({
      send: mockSend,
    }));
    mockSend.mockReset();
  });

  it("should return 400 if required fields are missing", async () => {
    const event = {
      body: JSON.stringify({ subject: "Test", message: "" }),
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: "Missing required fields",
    });
  });

  it("should return 200 if email is sent successfully", async () => {
    mockSend.mockResolvedValueOnce({ MessageId: "123" });

    const event = {
      body: JSON.stringify({
        subject: "Test Subject",
        message: "This is a test message.",
        from: "user@example.com",
      }),
    };

    const result = await handler(event);

    expect(mockSend).toHaveBeenCalledWith(expect.any(SendEmailCommand));
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      message: "Email sent successfully.",
    });
  });

  it("should return 500 if SES throws an error", async () => {
    mockSend.mockRejectedValueOnce(new Error("SES failure"));

    const event = {
      body: JSON.stringify({
        subject: "Test",
        message: "Test message",
        from: "user@example.com",
      }),
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: "Failed to send email",
    });
  });
});
