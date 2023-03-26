# Email

Email is the most pervasive form of business information exchange. People use email as an interpersonal communication tool and as the default choice to send files. Over time, your inbox becomes a personal email feed of what was sent by whom and when. Such an email feed has one fundamental flaw. Due to the design principle of the email system, the email cannot contain large attachments. Therefore, users often send links to external files instead of attachments. However, external files lose their authenticity by being removed from the correspondence context. Furthermore, links may expire with time or be blocked. As a result, your email feed deteriorates.

# Cargomail

Cargomail does not use attachments or links to external files. Instead, it uses an advanced web editor that allows users to reference documents, images, and videos in the message body by their content via a cryptographic hash value while keeping the respective resources in a content-addressed mailbox. Cargomail exchanges referenced resources between content-addressed mailboxes along with the corresponding email message. The final download link is constructed in the email client using the content-addressed mailbox location and the cryptographic hash value of the referenced resource.

# Features and Benefits

People can use Cargomail to store and exchange messages, documents, images, audio, and videos. Since Cargomail differs from the current email system, several decisive advantages are worth mentioning.

## Consistency

Your email feed will never break apart. Messages and their resources are kept together in chronological tamper-resistant records. A content-addressed mailbox ensures the authenticity and integrity of email messages and their resources. The cryptographic hash value guarantees the storage of only a single instance of a resource.

## Security

Optionally, Cargomail can use the [GRIP](https://github.com/cargomail-org/grip) mechanism to protect against spam. This mechanism does not protect against unsolicited emails — anyone can send you an email —  it protects you against a [DKIM replay attack](https://www.ietf.org/id/draft-chuang-dkim-replay-problem-01.html) that spammers use to bypass spam filters.

## Privacy

The [GRIP](https://github.com/cargomail-org/grip) mechanism decouples the content-addressable mailbox from the user's email address. This separation allows a user with a single email address to use multiple mailboxes. You can keep official, business, and personal correspondence separate on designated servers by using a single email address.