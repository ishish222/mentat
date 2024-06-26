import { BaseCache, serializeGeneration, deserializeStoredGeneration } from '@langchain/core/caches';
import { Generation } from '@langchain/core/outputs';
import { S3 } from 'aws-sdk';
import { createHash } from 'crypto';

export class S3Cache extends BaseCache<Generation[]> {
    private s3: S3;
    private bucketName: string;
    private prefix: string;
    private invalidate_next: boolean = false;

    constructor(awsConfig: { accessKeyId: string; secretAccessKey: string; region: string }, bucketName: string, prefix: string = '') {
        super();
        this.s3 = new S3({
            accessKeyId: awsConfig.accessKeyId,
            secretAccessKey: awsConfig.secretAccessKey,
            region: awsConfig.region
        });

        this.bucketName = bucketName;
        this.prefix = prefix;
    }

    /**
     * Retrieves data from the S3 bucket using a prompt and an LLM key. If the data is not found, it returns null.
     * @param prompt The prompt used to find the data.
     * @param llmKey The LLM key used to find the data.
     * @returns The data corresponding to the prompt and LLM key, or null if not found.
     */
    async lookup(prompt: string, llmKey: string): Promise<Generation[] | null> {
        const key = this.getCacheKey(prompt, llmKey);
        if(this.invalidate_next) {
            await this.delete(prompt, llmKey);
            this.invalidate_next = false;
            return null;
        }
        
        try {
            const result = await this.s3.getObject({
                Bucket: this.bucketName,
                Key: `${this.prefix}/${key}`
            }).promise();

            const data: Generation[] = result.Body ? JSON.parse(result.Body.toString()).map(deserializeStoredGeneration) : null;
            return data;
        } catch (error) {
            if(error.code === 'NoSuchKey') {
                console.log('Cache miss:', key);
            } else {
                console.error('Error retrieving object from S3:', error);
            }
            return null;
        }
    }

    /**
     * Updates the cache in the S3 bucket with new data using a prompt and an LLM key.
     * @param prompt The prompt used to store the data.
     * @param llmKey The LLM key used to store the data.
     * @param value The data to be stored.
     */
    async update(prompt: string, llmKey: string, value: Generation[]): Promise<void> {
        if(value.length === 0) {
            console.error('Empty value in cache update, ignoring');
            return;
        }
        const key = this.getCacheKey(prompt, llmKey);
        try {
            await this.s3.putObject({
                Bucket: this.bucketName,
                Key: `${this.prefix}/${key}`,
                Body: JSON.stringify(value.map(serializeGeneration))
            }).promise();
        } catch (error) {
            console.error('Error updating object in S3:', error);
        }
    }

    async set_invalidate_next() {
        this.invalidate_next = true;
    }

    async delete(prompt: string, llmKey: string): Promise<void> {
        const key = this.getCacheKey(prompt, llmKey);
        try {
            await this.s3.deleteObject({
                Bucket: this.bucketName,
                Key: `${this.prefix}/${key}`
            }).promise();
        } catch (error) {
            console.error('Error deleting object from S3:', error);
        }
    }

    /**
     * Helper method to generate a unique cache key based on the prompt and LLM key.
     * @param prompt The prompt used in the key.
     * @param llmKey The LLM key used in the key.
     * @returns A string representing the unique cache key.
     */
    private getCacheKey(prompt: string, llmKey: string): string {
        return createHash('md5').update(`${prompt}${llmKey}`).digest('hex');
    }
}
