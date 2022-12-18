import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  S3Event,
} from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  RekognitionClient,
  DetectLabelsCommand,
} from '@aws-sdk/client-rekognition';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

const rekogClient = new RekognitionClient({
  region: process.env.AWS_REGION,
});

export const generatePreSignedUrl = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const body = JSON.parse(event.body!);

  // Create the presigned URL.
  const signedUrl = await getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: process.env['imagesBucketName'],
      Key: body.filename,
    }),
    {
      expiresIn: 3600,
    },
  );

  let response: APIGatewayProxyResult;
  try {
    response = {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          // return recoginzer results db id
          url: signedUrl,
        },
      }),
    };
  } catch (err: unknown) {
    console.log(err);
    response = {
      statusCode: 500,
      body: JSON.stringify({
        message: err instanceof Error ? err.message : 'some error happened',
      }),
    };
  }

  return response;
};

export const imageRecognizer = async (event: S3Event) => {
  console.log('S3 Event: ', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const key = record.s3.object.key;

    try {
      const response = await rekogClient.send(
        new DetectLabelsCommand({
          Image: {
            S3Object: {
              Bucket: bucketName,
              Name: key,
            },
          },
        }),
      );
      console.log(response.Labels);

      response.Labels?.forEach((label) => {
        console.log(`Confidence: ${label.Confidence}`);
        console.log(`Name: ${label.Name}`);
        console.log('Instances:');
        label.Instances?.forEach((instance) => {
          console.log(instance);
        });
        console.log('Parents:');
        label.Parents?.forEach((name) => {
          console.log(name);
        });
        console.log('-------');
      });

      // return recoginzer results db id
    } catch (err) {
      console.log('Error', err);
    }
  }
};
