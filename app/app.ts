import { APIGatewayProxyEvent, APIGatewayProxyResult, S3Event } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    apiVersion: 'v4',
});

export const generatePreSignedUrl = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log(process.env.AWS_REGION);
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
    console.log('S3 Event: ', event);
};
