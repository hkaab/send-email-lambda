# 📧 Send Email Lambda

A lightweight AWS Lambda function to send transactional or contact-form emails using **AWS Simple Email Service (SES)**. Easily integrate it with API Gateway or use it as part of a serverless backend.

---

## 🚀 Features

- 📬 Send email via AWS SES
- 🔐 Supports secure environment variable configuration
- ⚙️ Easy integration with API Gateway or other AWS services
- 🧪 Minimal and maintainable codebase

---

## 📁 Project Structure

```

.
├── src/
│   └── index.js         # Lambda handler logic
├── package.json         # Project metadata and dependencies
└── README.md            # Project documentation

```

## 🚀 Deployment

You can deploy this Lambda function using the AWS CLI, AWS Console, or frameworks like Serverless Framework.

### Quick AWS CLI Example:

```bash
zip function.zip src/index.js node_modules/
aws lambda create-function \
  --function-name send-email-lambda \
  --runtime nodejs18.x \
  --handler src/index.handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::<your-account-id>:role/<your-lambda-role>
```



## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.

---

## 🙌 Contributions

Have a feature request or found a bug? Feel free to open an issue or submit a pull request!

---

## 👤 Author

Created by [@hkaab](https://github.com/hkaab) – feel free to reach out with questions or ideas!

```

---

Let me know if you're using SES in production mode, want attachments support, templated emails, or a Serverless Framework config (like `serverless.yml`) added to this. I’d be happy to extend it!
```
